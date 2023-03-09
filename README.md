# Why this fork exists

This fork was made to allow for building pkg executables on OpenBSD. At a high level:

- applies a patch from https://github.com/nodejs/node/issues/41224
- adjusts `CC` and `CXX` environment variables to use clang and clang++, respectively
- call `gmake` instead of `make`

# Building this package

To build pkg-fetch .tgz file:

```
npm pack
```

# Notes

Some things to keep in mind:

- use `ulimit` to bump up shell limits so the compiler will not run out of memory (which might necessitate first running `doas usermod -L daemon $USER`), the limits below worked for me on OpenBSD 7.2

- ensure that `/tmp` (the default directory that pkg does the compile) is on a filesystem that has `wxallowed`; if `/tmp` is its own filesystem without `wxallowed`, here is one way to temporarily allow it:

```
doas mount -u -o wxallowed /tmp
```

Or, set `PKG_BUILD_PATH` to a directory that has `wxallowed`.

Example:

```
ulimit -d 4194304 -m 8098884
MAKE_JOB_COUNT=$(sysctl -n hw.ncpu) npm run pkg ...
```
