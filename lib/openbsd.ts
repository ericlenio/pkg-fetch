import fs from 'fs';
import path from 'path';
import { spawnSync, SpawnSyncOptions } from 'child_process';
import { log } from './log';

const NODE_PORTS_DIR="/usr/ports/lang/node";
const IS_OPENBSD=process.platform==='openbsd';
if (IS_OPENBSD && !fs.existsSync(NODE_PORTS_DIR)) {
  const e=new Error(`expected ${NODE_PORTS_DIR} to exist, see: https://www.openbsd.org/faq/ports/ports.html`);
  throw e;
}

const getMakeVariable=(VARNAME: string)=>spawnSync("make",[`show=${VARNAME}`],{cwd:NODE_PORTS_DIR}).stdout.toString().trim();

process.env.MAKE_JOB_COUNT ??= '1';
// https://man.openbsd.org/bsd.port.mk.5#WRKOBJDIR
process.env.WRKOBJDIR ??= `/tmp/pkg-fetch`;
// https://man.openbsd.org/bsd.port.mk.5#PKGNAME
const PKGNAME = getMakeVariable('PKGNAME');
// https://man.openbsd.org/bsd.port.mk.5#DISTNAME
const DISTNAME = getMakeVariable('DISTNAME');
// https://man.openbsd.org/bsd.port.mk.5#WRKSRC
const WRKSRC = getMakeVariable('WRKSRC');
process.env.PKG_BUILD_PATH ??= `${process.env.WRKOBJDIR}/${PKGNAME}`;
log.info(`PKG_BUILD_PATH: ${process.env.PKG_BUILD_PATH}`);

const mySpawn=(cmd:string,cmdArgs?:string[],options?:SpawnSyncOptions)=>{
  const result=spawnSync(cmd,cmdArgs,options);
  if (result.error) {
    throw result.error;
  }
  return result;
};

const prepare=()=>{
  if (! IS_OPENBSD) {
    return;
  }
  log.info(`preparing for build on OpenBSD (using ports dir ${NODE_PORTS_DIR})`);
  mySpawn("make",['clean','patch'],{cwd:NODE_PORTS_DIR,stdio:'inherit'});
  // undo env.cc patch: need to restore the original way of how execPath is
  // computed because otherwise process.execPath gets hard-coded to
  // "/usr/local/bin/node" and that will break pkg's bootstrapping logic
  mySpawn("mv",[`${WRKSRC}/src/env.cc.orig.port`,`${WRKSRC}/src/env.cc`],{stdio:'inherit'});
  mySpawn("ln",["-s",DISTNAME,"node"],{cwd:process.env.PKG_BUILD_PATH,stdio:'inherit'});
};

const compileOnOpenbsd=()=>{
  log.info('start OpenBSD compile');
  mySpawn("make",[`-j${process.env.MAKE_JOB_COUNT}`,'build'],{cwd:NODE_PORTS_DIR,stdio:'inherit'});
  return path.join(WRKSRC,"out","Release","node");
};

export default {
  prepare,
  compileOnOpenbsd,
  isOpenbsd:IS_OPENBSD,
};
