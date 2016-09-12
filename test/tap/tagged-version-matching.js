'use strict'
var path = require('path')
var test = require('tap').test
var mr = require('npm-registry-mock')
var Tacks = require('tacks')
var File = Tacks.File
var Dir = Tacks.Dir
var extend = Object.assign || require('util')._extend
var common = require('../common-tap.js')

var basedir = path.join(__dirname, path.basename(__filename, '.js'))
var testdir = path.join(basedir, 'testdir')
var cachedir = path.join(basedir, 'cache')
var globaldir = path.join(basedir, 'global')
var tmpdir = path.join(basedir, 'tmp')

var conf = {
  cwd: testdir,
  env: extend({
    npm_config_cache: cachedir,
    npm_config_tmp: tmpdir,
    npm_config_prefix: globaldir,
    npm_config_registry: common.registry,
    npm_config_loglevel: 'warn'
  }, process.env)
}

var server
var fixture = new Tacks(Dir({
  cache: Dir(),
  global: Dir(),
  tmp: Dir(),
  testdir: Dir({
    node_modules: Dir({
      dep: Dir({
        'package.json': File({
          _from: 'dep@latest',
          _id: 'dep@1.0.0',
          _requested: {
            raw: 'dep@latest',
            scope: null,
            escapedName: 'dep',
            name: 'dep',
            rawSpec: 'latest',
            spec: 'latest',
            type: 'tag'
          },
          _resolved: 'https://registry.example.com/dep/-/dep-0.0.0.tgz',
          _shasum: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
          _spec: 'dep@latest',
          dist: {
            shasum: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
            tarball: 'https://registry.example.com/dep/-/dep-0.0.0.tgz'
          },
          name: 'dep',
          version: '1.0.0'
        })
      }),
      example: Dir({
        'package.json': File({
          _from: 'example',
          _id: 'example@1.0.0',
          _requested: {
            raw: 'example@file:example',
            scope: null,
            escapedName: 'example',
            name: 'example',
            rawSpec: 'file:example',
            type: 'directory'
          },
          _resolved: 'file:example',
          _shasum: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
          _spec: 'example@file:example',
          dependencies: {
            dep: 'latest'
          },
          name: 'example',
          version: '1.0.0'
        })
      })
    }),
    'npm-shrinkwrap.json': File({
      name: 'tagged-version-matching',
      version: '1.0.0',
      dependencies: {
        dep: {
          version: '0.0.0',
          from: 'dep@latest',
          resolved: 'https://registry.example.com/dep/-/dep-0.0.0.tgz'
        },
        example: {
          version: '1.0.0',
          from: 'example',
          resolved: 'file:example'
        }
      }
    }),
    'package.json': File({
      name: 'tagged-version-matching',
      version: '1.0.0',
      dependencies: {
        example: 'file:example/'
      }
    })
  })
}))

function setup () {
  cleanup()
  fixture.create(basedir)
}

function cleanup () {
  fixture.remove(basedir)
}

test('setup', function (t) {
  setup()
  mr({port: common.port, throwOnUnmatched: true}, function (err, s) {
    if (err) throw err
    server = s
    t.done()
  })
})

test('tagged-version-matching', function (t) {
  common.npm(['install'], conf, function (err, code, stdout, stderr) {
    if (err) throw err
    t.is(code, 0, 'command ran ok')
    t.comment(stdout.trim())
    t.comment(stderr.trim())
    t.is(stdout.trim(), '', 'no action, no output')
    t.is(stderr.trim(), '', 'no error output')
    // if everything is working as intended `npm install` won't do anything as the
    // provided `node_modules` will satisfy the `package.json` and the `npm-shrinkwrap.json`.
    // if not, `npm` will try to install the "missing" dependency named `dep`, which
    // `npm-registry-mock` knows nothing of, resulting in the command erroring out.
    t.done()
  })
})

test('cleanup', function (t) {
  server.close()
  cleanup()
  t.done()
})
