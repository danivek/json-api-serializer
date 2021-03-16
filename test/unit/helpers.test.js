const { expect } = require('chai');

const { set, toCamelCase, toSnakeCase, toKebabCase } = require('../../lib/helpers');

describe('Helpers', () => {
  describe('set', () => {
    it('should do nothing if it is not an object', () => {
      const object = 1;
      set(object, 'exist', true);
      expect(object).to.equal(1);
    });

    it('should set a value by path', () => {
      const object = { exist: {} };
      set(object, 'exist', true);
      set(object, 'a[0].b.c', 4);
      set(object, ['x', '0', 'y', 'z'], 5);
      expect(object).to.deep.equal({
        exist: true,
        a: [
          {
            b: {
              c: 4,
            },
          },
        ],
        x: [
          {
            y: {
              z: 5,
            },
          },
        ],
      });
    });
  });

  describe('toCamelCase', () => {
    it('should not choke on non-alpha characters', () => {
      expect(toCamelCase('*')).to.equal('*');
    });
  });

  describe('toSnakeCase', () => {
    it('should not choke on non-alphanumeric characters', () => {
      expect(toSnakeCase('*')).to.equal('*');
    });
  });

  describe('toKebabCase', () => {
    it('should not choke on non-alphanumeric characters', () => {
      expect(toKebabCase('*')).to.equal('*');
    });
  });
});
