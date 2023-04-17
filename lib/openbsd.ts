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

const getMakeVariable=(VARNAME: string)=>spawnSync("make",['-e',`show=${VARNAME}`],{cwd:NODE_PORTS_DIR}).stdout.toString().trim();

process.env.MAKE_JOB_COUNT ??= '1';
/*
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
*/

const mySpawn=(cmd:string,cmdArgs?:string[],options?:SpawnSyncOptions)=>{
  const result=spawnSync(cmd,cmdArgs,options);
  if (result.error) {
    throw result.error;
  }
  return result;
};

const prepare=(buildPath:string,nodeVersion:string)=>{
  if (! IS_OPENBSD) {
    return;
  }
  log.info(`preparing for build on OpenBSD (using ports dir ${NODE_PORTS_DIR}), node version ${nodeVersion}, build path ${buildPath}`);
  // mySpawn("make",['clean','patch'],{cwd:NODE_PORTS_DIR,stdio:'inherit'});
  // override NODE_VERSION in OpenBSD's makefile
  process.env.NODE_VERSION=nodeVersion;
  process.env.WRKOBJDIR=buildPath;
  process.env.CHECKSUM_FILE=`${buildPath}/checksums`;
  const WRKSRC=getMakeVariable('WRKSRC');
  const DISTNAME=getMakeVariable('DISTNAME');
  const PKGNAME=getMakeVariable('PKGNAME');
  const PATCHORIG=getMakeVariable('PATCHORIG');
  mySpawn("make",['-e','makesum','clean','patch'],{cwd:NODE_PORTS_DIR,stdio:'inherit'});
  // undo env.cc patch: need to restore the original way of how execPath is
  // computed because otherwise process.execPath gets hard-coded to
  // "/usr/local/bin/node" and that will break pkg's bootstrapping logic
  fs.renameSync(`${WRKSRC}/src/env.cc${PATCHORIG}`,`${WRKSRC}/src/env.cc`);
  // create symlink to match what pkg thinks is where the node source code is
  // expanded
  fs.rmdirSync(path.join(buildPath,"node"));
  mySpawn("ln",["-s",path.join(PKGNAME,DISTNAME),"node"],{cwd:buildPath,stdio:'inherit'});
};

const compileOnOpenbsd=()=>{
  log.info('start OpenBSD compile');
  mySpawn("make",['-e',`-j${process.env.MAKE_JOB_COUNT}`,
    // trick patch to not work here, as we already applied openbsd's patches
    'PATCH=/usr/bin/true','build'],{cwd:NODE_PORTS_DIR,stdio:'inherit'});
  const WRKSRC = getMakeVariable('WRKSRC');
  const nodeExec=path.join(WRKSRC,"out","Release","node");
  mySpawn("strip",[nodeExec],{stdio:'inherit'});
  return nodeExec;
};

export default {
  prepare,
  compileOnOpenbsd,
  isOpenbsd:IS_OPENBSD,
};
