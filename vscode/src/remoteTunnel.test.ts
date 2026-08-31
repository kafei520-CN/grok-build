import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advertisedPublicUrl,
  buildSshArgs,
  classifySshError,
  clampSshPort,
  AUTO_FORWARD_MAX,
  AUTO_FORWARD_MIN,
  DEFAULT_PUBLIC_HOST,
  pickAutoForwardPort,
  resolveForwardPort,
  resolvePublicHost,
  sanitizeTunnelHost,
  sanitizeTunnelUser,
} from './remoteTunnel';

describe('reverse tunnel helpers', () => {
  it('builds an outbound ssh reverse-forward command', () => {
    const args = buildSshArgs({
      host: '1.2.3.4',
      user: 'root',
      sshPort: 22,
      remotePort: 8787,
      localPort: 8787,
    });
    assert.ok(args.includes('-N'));
    assert.ok(args.includes('-R'));
    assert.ok(args.includes('0.0.0.0:8787:127.0.0.1:8787'));
    assert.ok(args.includes('root@1.2.3.4'));
    assert.ok(args.includes('BatchMode=yes'));
    assert.ok(args.includes('ExitOnForwardFailure=yes'));
  });

  it('sanitizes host, user, and ssh port', () => {
    assert.equal(sanitizeTunnelHost('vps.example.com'), 'vps.example.com');
    assert.equal(sanitizeTunnelHost('10.0.0.8'), '10.0.0.8');
    assert.equal(sanitizeTunnelHost('10.0.0.8; rm -rf /'), '');
    assert.equal(sanitizeTunnelUser('ubuntu'), 'ubuntu');
    assert.equal(sanitizeTunnelUser('root;id'), 'root');
    assert.equal(clampSshPort(22), 22);
    assert.equal(clampSshPort(0), 1);
  });

  it('classifies ssh failures', () => {
    assert.equal(classifySshError('Permission denied (publickey).'), 'auth');
    assert.equal(classifySshError('Could not resolve hostname vps'), 'host');
    assert.equal(classifySshError('Error: remote port forwarding failed for listen port 8787'), 'forward');
  });

  it('advertises http on the vps listen port', () => {
    assert.equal(advertisedPublicUrl('1.2.3.4', 8787), 'http://1.2.3.4:8787');
    assert.equal(advertisedPublicUrl('', 8787), '');
  });

  it('defaults an empty public host to the built-in relay', () => {
    assert.equal(resolvePublicHost(''), DEFAULT_PUBLIC_HOST);
    assert.equal(resolvePublicHost('10.0.0.2'), '10.0.0.2');
    assert.equal(resolveForwardPort(''), 0);
    assert.equal(resolveForwardPort(9000), 9000);
    const auto = pickAutoForwardPort();
    assert.ok(auto >= AUTO_FORWARD_MIN && auto <= AUTO_FORWARD_MAX);
  });
});
