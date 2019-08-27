/* eslint-disable func-names */
const { expect } = require('chai');

const LRU = require('../../lib/lru-cache');

describe('LRU Cache', function() {
  it('should create an LRU', function() {
    const lru = new LRU(5);
    expect(lru).to.have.property('head');
    expect(lru).to.have.property('tail');
    expect(lru.capacity).to.equal(5);
  });

  it('should set a single node, and be able to retreive it', function() {
    const lru = new LRU(5);
    lru.set('myKey', 'my-key');

    expect(lru.head.data).to.equal('my-key');
    expect(lru.head.previous).to.equal(null);
    expect(lru.head.next).to.equal(null);

    const myKey = lru.get('myKey');
    expect(myKey).to.equal('my-key');
  });

  it('should add new nodes to the head and move last fetched node to the head', function() {
    const lru = new LRU(5);
    lru.set(1, 1);
    lru.set(2, 2);
    lru.set(3, 3);
    lru.set(4, 4);

    let { head } = lru;
    expect(head.previous).to.equal(null);
    expect(head.data).to.equal(4);
    expect(head.next.data).to.equal(3);
    expect(head.next.next.data).to.equal(2);
    expect(head.next.next.next.data).to.equal(1);
    expect(head.next.next.next.next).to.equal(null);

    const result = lru.get(2);
    ({ head } = lru);
    expect(result).to.equal(2);
    expect(head.previous).to.equal(null);
    expect(head.data).to.equal(2);
    expect(head.next.data).to.equal(4);
    expect(head.next.next.data).to.equal(3);
    expect(head.next.next.next.data).to.equal(1);
    expect(head.next.next.next.next).to.equal(null);
  });

  it('should remove nodes after hitting capacity', function() {
    const lru = new LRU(5);
    lru.set(1, 1);
    lru.set(2, 2);
    lru.set(3, 3);
    lru.set(4, 4);
    lru.set(5, 5);
    lru.get(1);
    lru.set(6, 6);

    const { head } = lru;
    expect(head.previous).to.equal(null);
    expect(head.data).to.equal(6);
    expect(head.next.data).to.equal(1);
    expect(head.next.next.data).to.equal(5);
    expect(head.next.next.next.data).to.equal(4);
    expect(head.next.next.next.next.data).to.equal(3);
    expect(head.next.next.next.next.next).to.equal(null);
  });

  it('should create an LRU of infinite capacity', function() {
    const lru = new LRU(0);

    expect(lru.capacity).to.equal(Infinity);
  });

  it('should replace a node if the capacity is 1', function() {
    const lru = new LRU(1);

    lru.set(1, 1);
    lru.set(2, 2);

    const { head } = lru;
    expect(head.data).to.equal(2);
    expect(head.previous).to.equal(null);
    expect(head.next).to.equal(null);

    expect(lru.get(1)).to.equal(undefined);
    expect(lru.get(2)).to.equal(2);
  });

  it('should reset a nodes value if it already exists', function() {
    const lru = new LRU(5);
    lru.set(1, 1);
    lru.set(2, 2);
    lru.set(3, 3);

    lru.set(1, 10);

    expect(lru.head.data).to.equal(10);
    expect(lru.get(1)).to.equal(10);
  });
});
