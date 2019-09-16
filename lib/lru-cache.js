/* eslint-disable */

// Influenced by http://jsfiddle.net/2baax9nk/5/

class Node {
  constructor(key, data) {
    this.key = key;
    this.data = data;
    this.previous = null;
    this.next = null;
  }
}

module.exports = class LRU {
  constructor(capacity) {
    this.capacity = capacity === 0 ? Infinity : capacity;
    this.map = {};
    this.head = null;
    this.tail = null;
  }

  get(key) {
    // Existing item
    if (this.map[key] !== undefined) {
      // Move to the first place
      const node = this.map[key];
      this._moveFirst(node);

      // Return
      return node.data;
    }

    // Not found
    return undefined;
  }

  set(key, value) {
    // Existing item
    if (this.map[key] !== undefined) {
      // Move to the first place
      const node = this.map[key];
      node.data = value;
      this._moveFirst(node);
      return;
    }

    // Ensuring the cache is within capacity
    if (Object.keys(this.map).length >= this.capacity) {
      const id = this.tail.key;
      this._removeLast();
      delete this.map[id];
    }

    // New Item
    const node = new Node(key, value);
    this._add(node);
    this.map[key] = node;
  }

  _add(node) {
    node.next = null;
    node.previous = node.next;

    // first item
    if (this.head === null) {
      this.head = node;
      this.tail = node;
    } else {
      // adding to existing items
      this.head.previous = node;
      node.next = this.head;
      this.head = node;
    }
  }

  _remove(node) {
    // only item in the cache
    if (this.head === node && this.tail === node) {
      this.tail = null;
      this.head = this.tail;
      return;
    }

    // remove from head
    if (this.head === node) {
      this.head.next.previous = null;
      this.head = this.head.next;
      return;
    }

    // remove from tail
    if (this.tail === node) {
      this.tail.previous.next = null;
      this.tail = this.tail.previous;
      return;
    }

    // remove from middle
    node.previous.next = node.next;
    node.next.previous = node.previous;
  }

  _moveFirst(node) {
    this._remove(node);
    this._add(node);
  }

  _removeLast() {
    this._remove(this.tail);
  }
};
