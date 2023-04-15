# Why this fork exists

This fork of [pkg-fetch](https://github.com/vercel/pkg-fetch) was made to allow
for building [pkg](https://github.com/vercel/pkg) executables that run on
OpenBSD. Normally pkg-fetch attempts to download the node source directly from
nodejs.org and build it, but here we instead use OpenBSD
[ports](https://www.openbsd.org/faq/ports/ports.html) as the basis for building
the executable. This is because ports has a bunch of patches necessary to make
a compile actually work. So here we let ports apply those patches, then we
apply the normal pkg patch set, and then proceed with compiling.

# How to use this package

1. Add pkg as a normal dependency (or [dev dependency](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#devdependencies)) of your project
1. edit `package.json` and set up the [overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides) attribute for pkg-fetch, for example:

```json
"overrides": {
  "pkg-fetch": "npm:@lincware/pkg-fetch@3.4.3-2"
}
```

# Notes

Some things to keep in mind:

- I tested this successfully on OpenBSD 7.3 with node 18.15
- use `ulimit` to bump up shell limits so the compiler will not run out of memory (which might necessitate first running `doas usermod -L staff $USER`), the limits below worked for me
- ensure that `/tmp` (the default directory that pkg does the compile) is on a filesystem that has `wxallowed`; if `/tmp` is its own filesystem without `wxallowed`, here is one way to temporarily allow it:

```shell
doas mount -u -o wxallowed /tmp
```

Or, set `PKG_BUILD_PATH` to a directory that has `wxallowed`.

Example:

```shell
ulimit -d $(ulimit -Hd)
MAKE_JOB_COUNT=$(sysctl -n hw.ncpu) npx pkg ...
```
