(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.Erebos = {}));
}(this, function (exports) { 'use strict';

  function _extends() {
    _extends = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    return _extends.apply(this, arguments);
  }

  function _objectWithoutPropertiesLoose(source, excluded) {
    if (source == null) return {};
    var target = {};
    var sourceKeys = Object.keys(source);
    var key, i;

    for (i = 0; i < sourceKeys.length; i++) {
      key = sourceKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      target[key] = source[key];
    }

    return target;
  }

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  var global$1 = typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};

  var lookup = [];
  var revLookup = [];
  var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
  var inited = false;

  function init() {
    inited = true;
    var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    for (var i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }

    revLookup['-'.charCodeAt(0)] = 62;
    revLookup['_'.charCodeAt(0)] = 63;
  }

  function toByteArray(b64) {
    if (!inited) {
      init();
    }

    var i, j, l, tmp, placeHolders, arr;
    var len = b64.length;

    if (len % 4 > 0) {
      throw new Error('Invalid string. Length must be a multiple of 4');
    } // the number of equal signs (place holders)
    // if there are two placeholders, than the two characters before it
    // represent one byte
    // if there is only one, then the three characters before it represent 2 bytes
    // this is just a cheap hack to not do indexOf twice


    placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0; // base64 is 4/3 + up to two characters of the original data

    arr = new Arr(len * 3 / 4 - placeHolders); // if there are placeholders, only get up to the last complete 4 chars

    l = placeHolders > 0 ? len - 4 : len;
    var L = 0;

    for (i = 0, j = 0; i < l; i += 4, j += 3) {
      tmp = revLookup[b64.charCodeAt(i)] << 18 | revLookup[b64.charCodeAt(i + 1)] << 12 | revLookup[b64.charCodeAt(i + 2)] << 6 | revLookup[b64.charCodeAt(i + 3)];
      arr[L++] = tmp >> 16 & 0xFF;
      arr[L++] = tmp >> 8 & 0xFF;
      arr[L++] = tmp & 0xFF;
    }

    if (placeHolders === 2) {
      tmp = revLookup[b64.charCodeAt(i)] << 2 | revLookup[b64.charCodeAt(i + 1)] >> 4;
      arr[L++] = tmp & 0xFF;
    } else if (placeHolders === 1) {
      tmp = revLookup[b64.charCodeAt(i)] << 10 | revLookup[b64.charCodeAt(i + 1)] << 4 | revLookup[b64.charCodeAt(i + 2)] >> 2;
      arr[L++] = tmp >> 8 & 0xFF;
      arr[L++] = tmp & 0xFF;
    }

    return arr;
  }

  function tripletToBase64(num) {
    return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
  }

  function encodeChunk(uint8, start, end) {
    var tmp;
    var output = [];

    for (var i = start; i < end; i += 3) {
      tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + uint8[i + 2];
      output.push(tripletToBase64(tmp));
    }

    return output.join('');
  }

  function fromByteArray(uint8) {
    if (!inited) {
      init();
    }

    var tmp;
    var len = uint8.length;
    var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes

    var output = '';
    var parts = [];
    var maxChunkLength = 16383; // must be multiple of 3
    // go through the array every three bytes, we'll deal with trailing stuff later

    for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
      parts.push(encodeChunk(uint8, i, i + maxChunkLength > len2 ? len2 : i + maxChunkLength));
    } // pad the end with zeros, but make sure to not forget the extra bytes


    if (extraBytes === 1) {
      tmp = uint8[len - 1];
      output += lookup[tmp >> 2];
      output += lookup[tmp << 4 & 0x3F];
      output += '==';
    } else if (extraBytes === 2) {
      tmp = (uint8[len - 2] << 8) + uint8[len - 1];
      output += lookup[tmp >> 10];
      output += lookup[tmp >> 4 & 0x3F];
      output += lookup[tmp << 2 & 0x3F];
      output += '=';
    }

    parts.push(output);
    return parts.join('');
  }

  function read(buffer, offset, isLE, mLen, nBytes) {
    var e, m;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? nBytes - 1 : 0;
    var d = isLE ? -1 : 1;
    var s = buffer[offset + i];
    i += d;
    e = s & (1 << -nBits) - 1;
    s >>= -nBits;
    nBits += eLen;

    for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

    m = e & (1 << -nBits) - 1;
    e >>= -nBits;
    nBits += mLen;

    for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : (s ? -1 : 1) * Infinity;
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }

    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
  }
  function write(buffer, value, offset, isLE, mLen, nBytes) {
    var e, m, c;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
    var i = isLE ? 0 : nBytes - 1;
    var d = isLE ? 1 : -1;
    var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
    value = Math.abs(value);

    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);

      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }

      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }

      if (value * c >= 2) {
        e++;
        c /= 2;
      }

      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }

    for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

    e = e << mLen | m;
    eLen += mLen;

    for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

    buffer[offset + i - d] |= s * 128;
  }

  var toString = {}.toString;
  var isArray = Array.isArray || function (arr) {
    return toString.call(arr) == '[object Array]';
  };

  var INSPECT_MAX_BYTES = 50;
  /**
   * If `Buffer.TYPED_ARRAY_SUPPORT`:
   *   === true    Use Uint8Array implementation (fastest)
   *   === false   Use Object implementation (most compatible, even IE6)
   *
   * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
   * Opera 11.6+, iOS 4.2+.
   *
   * Due to various browser bugs, sometimes the Object implementation will be used even
   * when the browser supports typed arrays.
   *
   * Note:
   *
   *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
   *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
   *
   *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
   *
   *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
   *     incorrect length in some situations.

   * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
   * get the Object implementation, which is slower but behaves correctly.
   */

  Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined ? global$1.TYPED_ARRAY_SUPPORT : true;

  function kMaxLength() {
    return Buffer.TYPED_ARRAY_SUPPORT ? 0x7fffffff : 0x3fffffff;
  }

  function createBuffer(that, length) {
    if (kMaxLength() < length) {
      throw new RangeError('Invalid typed array length');
    }

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      // Return an augmented `Uint8Array` instance, for best performance
      that = new Uint8Array(length);
      that.__proto__ = Buffer.prototype;
    } else {
      // Fallback: Return an object instance of the Buffer class
      if (that === null) {
        that = new Buffer(length);
      }

      that.length = length;
    }

    return that;
  }
  /**
   * The Buffer constructor returns instances of `Uint8Array` that have their
   * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
   * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
   * and the `Uint8Array` methods. Square bracket notation works as expected -- it
   * returns a single octet.
   *
   * The `Uint8Array` prototype remains unmodified.
   */


  function Buffer(arg, encodingOrOffset, length) {
    if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
      return new Buffer(arg, encodingOrOffset, length);
    } // Common case.


    if (typeof arg === 'number') {
      if (typeof encodingOrOffset === 'string') {
        throw new Error('If encoding is specified then the first argument must be a string');
      }

      return allocUnsafe(this, arg);
    }

    return from(this, arg, encodingOrOffset, length);
  }
  Buffer.poolSize = 8192; // not used by this implementation
  // TODO: Legacy, not needed anymore. Remove in next major version.

  Buffer._augment = function (arr) {
    arr.__proto__ = Buffer.prototype;
    return arr;
  };

  function from(that, value, encodingOrOffset, length) {
    if (typeof value === 'number') {
      throw new TypeError('"value" argument must not be a number');
    }

    if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
      return fromArrayBuffer(that, value, encodingOrOffset, length);
    }

    if (typeof value === 'string') {
      return fromString(that, value, encodingOrOffset);
    }

    return fromObject(that, value);
  }
  /**
   * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
   * if value is a number.
   * Buffer.from(str[, encoding])
   * Buffer.from(array)
   * Buffer.from(buffer)
   * Buffer.from(arrayBuffer[, byteOffset[, length]])
   **/


  Buffer.from = function (value, encodingOrOffset, length) {
    return from(null, value, encodingOrOffset, length);
  };

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    Buffer.prototype.__proto__ = Uint8Array.prototype;
    Buffer.__proto__ = Uint8Array;
  }

  function assertSize(size) {
    if (typeof size !== 'number') {
      throw new TypeError('"size" argument must be a number');
    } else if (size < 0) {
      throw new RangeError('"size" argument must not be negative');
    }
  }

  function alloc(that, size, fill, encoding) {
    assertSize(size);

    if (size <= 0) {
      return createBuffer(that, size);
    }

    if (fill !== undefined) {
      // Only pay attention to encoding if it's a string. This
      // prevents accidentally sending in a number that would
      // be interpretted as a start offset.
      return typeof encoding === 'string' ? createBuffer(that, size).fill(fill, encoding) : createBuffer(that, size).fill(fill);
    }

    return createBuffer(that, size);
  }
  /**
   * Creates a new filled Buffer instance.
   * alloc(size[, fill[, encoding]])
   **/


  Buffer.alloc = function (size, fill, encoding) {
    return alloc(null, size, fill, encoding);
  };

  function allocUnsafe(that, size) {
    assertSize(size);
    that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);

    if (!Buffer.TYPED_ARRAY_SUPPORT) {
      for (var i = 0; i < size; ++i) {
        that[i] = 0;
      }
    }

    return that;
  }
  /**
   * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
   * */


  Buffer.allocUnsafe = function (size) {
    return allocUnsafe(null, size);
  };
  /**
   * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
   */


  Buffer.allocUnsafeSlow = function (size) {
    return allocUnsafe(null, size);
  };

  function fromString(that, string, encoding) {
    if (typeof encoding !== 'string' || encoding === '') {
      encoding = 'utf8';
    }

    if (!Buffer.isEncoding(encoding)) {
      throw new TypeError('"encoding" must be a valid string encoding');
    }

    var length = byteLength(string, encoding) | 0;
    that = createBuffer(that, length);
    var actual = that.write(string, encoding);

    if (actual !== length) {
      // Writing a hex string, for example, that contains invalid characters will
      // cause everything after the first invalid character to be ignored. (e.g.
      // 'abxxcd' will be treated as 'ab')
      that = that.slice(0, actual);
    }

    return that;
  }

  function fromArrayLike(that, array) {
    var length = array.length < 0 ? 0 : checked(array.length) | 0;
    that = createBuffer(that, length);

    for (var i = 0; i < length; i += 1) {
      that[i] = array[i] & 255;
    }

    return that;
  }

  function fromArrayBuffer(that, array, byteOffset, length) {
    array.byteLength; // this throws if `array` is not a valid ArrayBuffer

    if (byteOffset < 0 || array.byteLength < byteOffset) {
      throw new RangeError('\'offset\' is out of bounds');
    }

    if (array.byteLength < byteOffset + (length || 0)) {
      throw new RangeError('\'length\' is out of bounds');
    }

    if (byteOffset === undefined && length === undefined) {
      array = new Uint8Array(array);
    } else if (length === undefined) {
      array = new Uint8Array(array, byteOffset);
    } else {
      array = new Uint8Array(array, byteOffset, length);
    }

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      // Return an augmented `Uint8Array` instance, for best performance
      that = array;
      that.__proto__ = Buffer.prototype;
    } else {
      // Fallback: Return an object instance of the Buffer class
      that = fromArrayLike(that, array);
    }

    return that;
  }

  function fromObject(that, obj) {
    if (internalIsBuffer(obj)) {
      var len = checked(obj.length) | 0;
      that = createBuffer(that, len);

      if (that.length === 0) {
        return that;
      }

      obj.copy(that, 0, 0, len);
      return that;
    }

    if (obj) {
      if (typeof ArrayBuffer !== 'undefined' && obj.buffer instanceof ArrayBuffer || 'length' in obj) {
        if (typeof obj.length !== 'number' || isnan(obj.length)) {
          return createBuffer(that, 0);
        }

        return fromArrayLike(that, obj);
      }

      if (obj.type === 'Buffer' && isArray(obj.data)) {
        return fromArrayLike(that, obj.data);
      }
    }

    throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.');
  }

  function checked(length) {
    // Note: cannot use `length < kMaxLength()` here because that fails when
    // length is NaN (which is otherwise coerced to zero.)
    if (length >= kMaxLength()) {
      throw new RangeError('Attempt to allocate Buffer larger than maximum ' + 'size: 0x' + kMaxLength().toString(16) + ' bytes');
    }

    return length | 0;
  }
  Buffer.isBuffer = isBuffer;

  function internalIsBuffer(b) {
    return !!(b != null && b._isBuffer);
  }

  Buffer.compare = function compare(a, b) {
    if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
      throw new TypeError('Arguments must be Buffers');
    }

    if (a === b) return 0;
    var x = a.length;
    var y = b.length;

    for (var i = 0, len = Math.min(x, y); i < len; ++i) {
      if (a[i] !== b[i]) {
        x = a[i];
        y = b[i];
        break;
      }
    }

    if (x < y) return -1;
    if (y < x) return 1;
    return 0;
  };

  Buffer.isEncoding = function isEncoding(encoding) {
    switch (String(encoding).toLowerCase()) {
      case 'hex':
      case 'utf8':
      case 'utf-8':
      case 'ascii':
      case 'latin1':
      case 'binary':
      case 'base64':
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return true;

      default:
        return false;
    }
  };

  Buffer.concat = function concat(list, length) {
    if (!isArray(list)) {
      throw new TypeError('"list" argument must be an Array of Buffers');
    }

    if (list.length === 0) {
      return Buffer.alloc(0);
    }

    var i;

    if (length === undefined) {
      length = 0;

      for (i = 0; i < list.length; ++i) {
        length += list[i].length;
      }
    }

    var buffer = Buffer.allocUnsafe(length);
    var pos = 0;

    for (i = 0; i < list.length; ++i) {
      var buf = list[i];

      if (!internalIsBuffer(buf)) {
        throw new TypeError('"list" argument must be an Array of Buffers');
      }

      buf.copy(buffer, pos);
      pos += buf.length;
    }

    return buffer;
  };

  function byteLength(string, encoding) {
    if (internalIsBuffer(string)) {
      return string.length;
    }

    if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' && (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
      return string.byteLength;
    }

    if (typeof string !== 'string') {
      string = '' + string;
    }

    var len = string.length;
    if (len === 0) return 0; // Use a for loop to avoid recursion

    var loweredCase = false;

    for (;;) {
      switch (encoding) {
        case 'ascii':
        case 'latin1':
        case 'binary':
          return len;

        case 'utf8':
        case 'utf-8':
        case undefined:
          return utf8ToBytes(string).length;

        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return len * 2;

        case 'hex':
          return len >>> 1;

        case 'base64':
          return base64ToBytes(string).length;

        default:
          if (loweredCase) return utf8ToBytes(string).length; // assume utf8

          encoding = ('' + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  }

  Buffer.byteLength = byteLength;

  function slowToString(encoding, start, end) {
    var loweredCase = false; // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
    // property of a typed array.
    // This behaves neither like String nor Uint8Array in that we set start/end
    // to their upper/lower bounds if the value passed is out of range.
    // undefined is handled specially as per ECMA-262 6th Edition,
    // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.

    if (start === undefined || start < 0) {
      start = 0;
    } // Return early if start > this.length. Done here to prevent potential uint32
    // coercion fail below.


    if (start > this.length) {
      return '';
    }

    if (end === undefined || end > this.length) {
      end = this.length;
    }

    if (end <= 0) {
      return '';
    } // Force coersion to uint32. This will also coerce falsey/NaN values to 0.


    end >>>= 0;
    start >>>= 0;

    if (end <= start) {
      return '';
    }

    if (!encoding) encoding = 'utf8';

    while (true) {
      switch (encoding) {
        case 'hex':
          return hexSlice(this, start, end);

        case 'utf8':
        case 'utf-8':
          return utf8Slice(this, start, end);

        case 'ascii':
          return asciiSlice(this, start, end);

        case 'latin1':
        case 'binary':
          return latin1Slice(this, start, end);

        case 'base64':
          return base64Slice(this, start, end);

        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return utf16leSlice(this, start, end);

        default:
          if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding);
          encoding = (encoding + '').toLowerCase();
          loweredCase = true;
      }
    }
  } // The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
  // Buffer instances.


  Buffer.prototype._isBuffer = true;

  function swap(b, n, m) {
    var i = b[n];
    b[n] = b[m];
    b[m] = i;
  }

  Buffer.prototype.swap16 = function swap16() {
    var len = this.length;

    if (len % 2 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 16-bits');
    }

    for (var i = 0; i < len; i += 2) {
      swap(this, i, i + 1);
    }

    return this;
  };

  Buffer.prototype.swap32 = function swap32() {
    var len = this.length;

    if (len % 4 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 32-bits');
    }

    for (var i = 0; i < len; i += 4) {
      swap(this, i, i + 3);
      swap(this, i + 1, i + 2);
    }

    return this;
  };

  Buffer.prototype.swap64 = function swap64() {
    var len = this.length;

    if (len % 8 !== 0) {
      throw new RangeError('Buffer size must be a multiple of 64-bits');
    }

    for (var i = 0; i < len; i += 8) {
      swap(this, i, i + 7);
      swap(this, i + 1, i + 6);
      swap(this, i + 2, i + 5);
      swap(this, i + 3, i + 4);
    }

    return this;
  };

  Buffer.prototype.toString = function toString() {
    var length = this.length | 0;
    if (length === 0) return '';
    if (arguments.length === 0) return utf8Slice(this, 0, length);
    return slowToString.apply(this, arguments);
  };

  Buffer.prototype.equals = function equals(b) {
    if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer');
    if (this === b) return true;
    return Buffer.compare(this, b) === 0;
  };

  Buffer.prototype.inspect = function inspect() {
    var str = '';
    var max = INSPECT_MAX_BYTES;

    if (this.length > 0) {
      str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
      if (this.length > max) str += ' ... ';
    }

    return '<Buffer ' + str + '>';
  };

  Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
    if (!internalIsBuffer(target)) {
      throw new TypeError('Argument must be a Buffer');
    }

    if (start === undefined) {
      start = 0;
    }

    if (end === undefined) {
      end = target ? target.length : 0;
    }

    if (thisStart === undefined) {
      thisStart = 0;
    }

    if (thisEnd === undefined) {
      thisEnd = this.length;
    }

    if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
      throw new RangeError('out of range index');
    }

    if (thisStart >= thisEnd && start >= end) {
      return 0;
    }

    if (thisStart >= thisEnd) {
      return -1;
    }

    if (start >= end) {
      return 1;
    }

    start >>>= 0;
    end >>>= 0;
    thisStart >>>= 0;
    thisEnd >>>= 0;
    if (this === target) return 0;
    var x = thisEnd - thisStart;
    var y = end - start;
    var len = Math.min(x, y);
    var thisCopy = this.slice(thisStart, thisEnd);
    var targetCopy = target.slice(start, end);

    for (var i = 0; i < len; ++i) {
      if (thisCopy[i] !== targetCopy[i]) {
        x = thisCopy[i];
        y = targetCopy[i];
        break;
      }
    }

    if (x < y) return -1;
    if (y < x) return 1;
    return 0;
  }; // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
  // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
  //
  // Arguments:
  // - buffer - a Buffer to search
  // - val - a string, Buffer, or number
  // - byteOffset - an index into `buffer`; will be clamped to an int32
  // - encoding - an optional encoding, relevant is val is a string
  // - dir - true for indexOf, false for lastIndexOf


  function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
    // Empty buffer means no match
    if (buffer.length === 0) return -1; // Normalize byteOffset

    if (typeof byteOffset === 'string') {
      encoding = byteOffset;
      byteOffset = 0;
    } else if (byteOffset > 0x7fffffff) {
      byteOffset = 0x7fffffff;
    } else if (byteOffset < -0x80000000) {
      byteOffset = -0x80000000;
    }

    byteOffset = +byteOffset; // Coerce to Number.

    if (isNaN(byteOffset)) {
      // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
      byteOffset = dir ? 0 : buffer.length - 1;
    } // Normalize byteOffset: negative offsets start from the end of the buffer


    if (byteOffset < 0) byteOffset = buffer.length + byteOffset;

    if (byteOffset >= buffer.length) {
      if (dir) return -1;else byteOffset = buffer.length - 1;
    } else if (byteOffset < 0) {
      if (dir) byteOffset = 0;else return -1;
    } // Normalize val


    if (typeof val === 'string') {
      val = Buffer.from(val, encoding);
    } // Finally, search either indexOf (if dir is true) or lastIndexOf


    if (internalIsBuffer(val)) {
      // Special case: looking for empty string/buffer always fails
      if (val.length === 0) {
        return -1;
      }

      return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
    } else if (typeof val === 'number') {
      val = val & 0xFF; // Search for a byte value [0-255]

      if (Buffer.TYPED_ARRAY_SUPPORT && typeof Uint8Array.prototype.indexOf === 'function') {
        if (dir) {
          return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
        } else {
          return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
        }
      }

      return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
    }

    throw new TypeError('val must be string, number or Buffer');
  }

  function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
    var indexSize = 1;
    var arrLength = arr.length;
    var valLength = val.length;

    if (encoding !== undefined) {
      encoding = String(encoding).toLowerCase();

      if (encoding === 'ucs2' || encoding === 'ucs-2' || encoding === 'utf16le' || encoding === 'utf-16le') {
        if (arr.length < 2 || val.length < 2) {
          return -1;
        }

        indexSize = 2;
        arrLength /= 2;
        valLength /= 2;
        byteOffset /= 2;
      }
    }

    function read(buf, i) {
      if (indexSize === 1) {
        return buf[i];
      } else {
        return buf.readUInt16BE(i * indexSize);
      }
    }

    var i;

    if (dir) {
      var foundIndex = -1;

      for (i = byteOffset; i < arrLength; i++) {
        if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
          if (foundIndex === -1) foundIndex = i;
          if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
        } else {
          if (foundIndex !== -1) i -= i - foundIndex;
          foundIndex = -1;
        }
      }
    } else {
      if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;

      for (i = byteOffset; i >= 0; i--) {
        var found = true;

        for (var j = 0; j < valLength; j++) {
          if (read(arr, i + j) !== read(val, j)) {
            found = false;
            break;
          }
        }

        if (found) return i;
      }
    }

    return -1;
  }

  Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
    return this.indexOf(val, byteOffset, encoding) !== -1;
  };

  Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
  };

  Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
  };

  function hexWrite(buf, string, offset, length) {
    offset = Number(offset) || 0;
    var remaining = buf.length - offset;

    if (!length) {
      length = remaining;
    } else {
      length = Number(length);

      if (length > remaining) {
        length = remaining;
      }
    } // must be an even number of digits


    var strLen = string.length;
    if (strLen % 2 !== 0) throw new TypeError('Invalid hex string');

    if (length > strLen / 2) {
      length = strLen / 2;
    }

    for (var i = 0; i < length; ++i) {
      var parsed = parseInt(string.substr(i * 2, 2), 16);
      if (isNaN(parsed)) return i;
      buf[offset + i] = parsed;
    }

    return i;
  }

  function utf8Write(buf, string, offset, length) {
    return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
  }

  function asciiWrite(buf, string, offset, length) {
    return blitBuffer(asciiToBytes(string), buf, offset, length);
  }

  function latin1Write(buf, string, offset, length) {
    return asciiWrite(buf, string, offset, length);
  }

  function base64Write(buf, string, offset, length) {
    return blitBuffer(base64ToBytes(string), buf, offset, length);
  }

  function ucs2Write(buf, string, offset, length) {
    return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
  }

  Buffer.prototype.write = function write(string, offset, length, encoding) {
    // Buffer#write(string)
    if (offset === undefined) {
      encoding = 'utf8';
      length = this.length;
      offset = 0; // Buffer#write(string, encoding)
    } else if (length === undefined && typeof offset === 'string') {
      encoding = offset;
      length = this.length;
      offset = 0; // Buffer#write(string, offset[, length][, encoding])
    } else if (isFinite(offset)) {
      offset = offset | 0;

      if (isFinite(length)) {
        length = length | 0;
        if (encoding === undefined) encoding = 'utf8';
      } else {
        encoding = length;
        length = undefined;
      } // legacy write(string, encoding, offset, length) - remove in v0.13

    } else {
      throw new Error('Buffer.write(string, encoding, offset[, length]) is no longer supported');
    }

    var remaining = this.length - offset;
    if (length === undefined || length > remaining) length = remaining;

    if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
      throw new RangeError('Attempt to write outside buffer bounds');
    }

    if (!encoding) encoding = 'utf8';
    var loweredCase = false;

    for (;;) {
      switch (encoding) {
        case 'hex':
          return hexWrite(this, string, offset, length);

        case 'utf8':
        case 'utf-8':
          return utf8Write(this, string, offset, length);

        case 'ascii':
          return asciiWrite(this, string, offset, length);

        case 'latin1':
        case 'binary':
          return latin1Write(this, string, offset, length);

        case 'base64':
          // Warning: maxLength not taken into account in base64Write
          return base64Write(this, string, offset, length);

        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return ucs2Write(this, string, offset, length);

        default:
          if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding);
          encoding = ('' + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  };

  Buffer.prototype.toJSON = function toJSON() {
    return {
      type: 'Buffer',
      data: Array.prototype.slice.call(this._arr || this, 0)
    };
  };

  function base64Slice(buf, start, end) {
    if (start === 0 && end === buf.length) {
      return fromByteArray(buf);
    } else {
      return fromByteArray(buf.slice(start, end));
    }
  }

  function utf8Slice(buf, start, end) {
    end = Math.min(buf.length, end);
    var res = [];
    var i = start;

    while (i < end) {
      var firstByte = buf[i];
      var codePoint = null;
      var bytesPerSequence = firstByte > 0xEF ? 4 : firstByte > 0xDF ? 3 : firstByte > 0xBF ? 2 : 1;

      if (i + bytesPerSequence <= end) {
        var secondByte, thirdByte, fourthByte, tempCodePoint;

        switch (bytesPerSequence) {
          case 1:
            if (firstByte < 0x80) {
              codePoint = firstByte;
            }

            break;

          case 2:
            secondByte = buf[i + 1];

            if ((secondByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0x1F) << 0x6 | secondByte & 0x3F;

              if (tempCodePoint > 0x7F) {
                codePoint = tempCodePoint;
              }
            }

            break;

          case 3:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];

            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | thirdByte & 0x3F;

              if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                codePoint = tempCodePoint;
              }
            }

            break;

          case 4:
            secondByte = buf[i + 1];
            thirdByte = buf[i + 2];
            fourthByte = buf[i + 3];

            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | fourthByte & 0x3F;

              if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                codePoint = tempCodePoint;
              }
            }

        }
      }

      if (codePoint === null) {
        // we did not generate a valid codePoint so insert a
        // replacement char (U+FFFD) and advance only 1 byte
        codePoint = 0xFFFD;
        bytesPerSequence = 1;
      } else if (codePoint > 0xFFFF) {
        // encode to utf16 (surrogate pair dance)
        codePoint -= 0x10000;
        res.push(codePoint >>> 10 & 0x3FF | 0xD800);
        codePoint = 0xDC00 | codePoint & 0x3FF;
      }

      res.push(codePoint);
      i += bytesPerSequence;
    }

    return decodeCodePointsArray(res);
  } // Based on http://stackoverflow.com/a/22747272/680742, the browser with
  // the lowest limit is Chrome, with 0x10000 args.
  // We go 1 magnitude less, for safety


  var MAX_ARGUMENTS_LENGTH = 0x1000;

  function decodeCodePointsArray(codePoints) {
    var len = codePoints.length;

    if (len <= MAX_ARGUMENTS_LENGTH) {
      return String.fromCharCode.apply(String, codePoints); // avoid extra slice()
    } // Decode in chunks to avoid "call stack size exceeded".


    var res = '';
    var i = 0;

    while (i < len) {
      res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
    }

    return res;
  }

  function asciiSlice(buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);

    for (var i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i] & 0x7F);
    }

    return ret;
  }

  function latin1Slice(buf, start, end) {
    var ret = '';
    end = Math.min(buf.length, end);

    for (var i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i]);
    }

    return ret;
  }

  function hexSlice(buf, start, end) {
    var len = buf.length;
    if (!start || start < 0) start = 0;
    if (!end || end < 0 || end > len) end = len;
    var out = '';

    for (var i = start; i < end; ++i) {
      out += toHex(buf[i]);
    }

    return out;
  }

  function utf16leSlice(buf, start, end) {
    var bytes = buf.slice(start, end);
    var res = '';

    for (var i = 0; i < bytes.length; i += 2) {
      res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
    }

    return res;
  }

  Buffer.prototype.slice = function slice(start, end) {
    var len = this.length;
    start = ~~start;
    end = end === undefined ? len : ~~end;

    if (start < 0) {
      start += len;
      if (start < 0) start = 0;
    } else if (start > len) {
      start = len;
    }

    if (end < 0) {
      end += len;
      if (end < 0) end = 0;
    } else if (end > len) {
      end = len;
    }

    if (end < start) end = start;
    var newBuf;

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      newBuf = this.subarray(start, end);
      newBuf.__proto__ = Buffer.prototype;
    } else {
      var sliceLen = end - start;
      newBuf = new Buffer(sliceLen, undefined);

      for (var i = 0; i < sliceLen; ++i) {
        newBuf[i] = this[i + start];
      }
    }

    return newBuf;
  };
  /*
   * Need to make sure that buffer isn't trying to write out of bounds.
   */


  function checkOffset(offset, ext, length) {
    if (offset % 1 !== 0 || offset < 0) throw new RangeError('offset is not uint');
    if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length');
  }

  Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) checkOffset(offset, byteLength, this.length);
    var val = this[offset];
    var mul = 1;
    var i = 0;

    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }

    return val;
  };

  Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;

    if (!noAssert) {
      checkOffset(offset, byteLength, this.length);
    }

    var val = this[offset + --byteLength];
    var mul = 1;

    while (byteLength > 0 && (mul *= 0x100)) {
      val += this[offset + --byteLength] * mul;
    }

    return val;
  };

  Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 1, this.length);
    return this[offset];
  };

  Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    return this[offset] | this[offset + 1] << 8;
  };

  Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    return this[offset] << 8 | this[offset + 1];
  };

  Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 0x1000000;
  };

  Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] * 0x1000000 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
  };

  Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) checkOffset(offset, byteLength, this.length);
    var val = this[offset];
    var mul = 1;
    var i = 0;

    while (++i < byteLength && (mul *= 0x100)) {
      val += this[offset + i] * mul;
    }

    mul *= 0x80;
    if (val >= mul) val -= Math.pow(2, 8 * byteLength);
    return val;
  };

  Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
    offset = offset | 0;
    byteLength = byteLength | 0;
    if (!noAssert) checkOffset(offset, byteLength, this.length);
    var i = byteLength;
    var mul = 1;
    var val = this[offset + --i];

    while (i > 0 && (mul *= 0x100)) {
      val += this[offset + --i] * mul;
    }

    mul *= 0x80;
    if (val >= mul) val -= Math.pow(2, 8 * byteLength);
    return val;
  };

  Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 1, this.length);
    if (!(this[offset] & 0x80)) return this[offset];
    return (0xff - this[offset] + 1) * -1;
  };

  Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    var val = this[offset] | this[offset + 1] << 8;
    return val & 0x8000 ? val | 0xFFFF0000 : val;
  };

  Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 2, this.length);
    var val = this[offset + 1] | this[offset] << 8;
    return val & 0x8000 ? val | 0xFFFF0000 : val;
  };

  Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
  };

  Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
  };

  Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return read(this, offset, true, 23, 4);
  };

  Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 4, this.length);
    return read(this, offset, false, 23, 4);
  };

  Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 8, this.length);
    return read(this, offset, true, 52, 8);
  };

  Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
    if (!noAssert) checkOffset(offset, 8, this.length);
    return read(this, offset, false, 52, 8);
  };

  function checkInt(buf, value, offset, ext, max, min) {
    if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
    if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
    if (offset + ext > buf.length) throw new RangeError('Index out of range');
  }

  Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;

    if (!noAssert) {
      var maxBytes = Math.pow(2, 8 * byteLength) - 1;
      checkInt(this, value, offset, byteLength, maxBytes, 0);
    }

    var mul = 1;
    var i = 0;
    this[offset] = value & 0xFF;

    while (++i < byteLength && (mul *= 0x100)) {
      this[offset + i] = value / mul & 0xFF;
    }

    return offset + byteLength;
  };

  Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;
    byteLength = byteLength | 0;

    if (!noAssert) {
      var maxBytes = Math.pow(2, 8 * byteLength) - 1;
      checkInt(this, value, offset, byteLength, maxBytes, 0);
    }

    var i = byteLength - 1;
    var mul = 1;
    this[offset + i] = value & 0xFF;

    while (--i >= 0 && (mul *= 0x100)) {
      this[offset + i] = value / mul & 0xFF;
    }

    return offset + byteLength;
  };

  Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
    if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
    this[offset] = value & 0xff;
    return offset + 1;
  };

  function objectWriteUInt16(buf, value, offset, littleEndian) {
    if (value < 0) value = 0xffff + value + 1;

    for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
      buf[offset + i] = (value & 0xff << 8 * (littleEndian ? i : 1 - i)) >>> (littleEndian ? i : 1 - i) * 8;
    }
  }

  Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value & 0xff;
      this[offset + 1] = value >>> 8;
    } else {
      objectWriteUInt16(this, value, offset, true);
    }

    return offset + 2;
  };

  Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value >>> 8;
      this[offset + 1] = value & 0xff;
    } else {
      objectWriteUInt16(this, value, offset, false);
    }

    return offset + 2;
  };

  function objectWriteUInt32(buf, value, offset, littleEndian) {
    if (value < 0) value = 0xffffffff + value + 1;

    for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
      buf[offset + i] = value >>> (littleEndian ? i : 3 - i) * 8 & 0xff;
    }
  }

  Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset + 3] = value >>> 24;
      this[offset + 2] = value >>> 16;
      this[offset + 1] = value >>> 8;
      this[offset] = value & 0xff;
    } else {
      objectWriteUInt32(this, value, offset, true);
    }

    return offset + 4;
  };

  Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 0xff;
    } else {
      objectWriteUInt32(this, value, offset, false);
    }

    return offset + 4;
  };

  Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;

    if (!noAssert) {
      var limit = Math.pow(2, 8 * byteLength - 1);
      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }

    var i = 0;
    var mul = 1;
    var sub = 0;
    this[offset] = value & 0xFF;

    while (++i < byteLength && (mul *= 0x100)) {
      if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
        sub = 1;
      }

      this[offset + i] = (value / mul >> 0) - sub & 0xFF;
    }

    return offset + byteLength;
  };

  Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
    value = +value;
    offset = offset | 0;

    if (!noAssert) {
      var limit = Math.pow(2, 8 * byteLength - 1);
      checkInt(this, value, offset, byteLength, limit - 1, -limit);
    }

    var i = byteLength - 1;
    var mul = 1;
    var sub = 0;
    this[offset + i] = value & 0xFF;

    while (--i >= 0 && (mul *= 0x100)) {
      if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
        sub = 1;
      }

      this[offset + i] = (value / mul >> 0) - sub & 0xFF;
    }

    return offset + byteLength;
  };

  Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
    if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
    if (value < 0) value = 0xff + value + 1;
    this[offset] = value & 0xff;
    return offset + 1;
  };

  Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value & 0xff;
      this[offset + 1] = value >>> 8;
    } else {
      objectWriteUInt16(this, value, offset, true);
    }

    return offset + 2;
  };

  Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value >>> 8;
      this[offset + 1] = value & 0xff;
    } else {
      objectWriteUInt16(this, value, offset, false);
    }

    return offset + 2;
  };

  Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value & 0xff;
      this[offset + 1] = value >>> 8;
      this[offset + 2] = value >>> 16;
      this[offset + 3] = value >>> 24;
    } else {
      objectWriteUInt32(this, value, offset, true);
    }

    return offset + 4;
  };

  Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset | 0;
    if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
    if (value < 0) value = 0xffffffff + value + 1;

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      this[offset] = value >>> 24;
      this[offset + 1] = value >>> 16;
      this[offset + 2] = value >>> 8;
      this[offset + 3] = value & 0xff;
    } else {
      objectWriteUInt32(this, value, offset, false);
    }

    return offset + 4;
  };

  function checkIEEE754(buf, value, offset, ext, max, min) {
    if (offset + ext > buf.length) throw new RangeError('Index out of range');
    if (offset < 0) throw new RangeError('Index out of range');
  }

  function writeFloat(buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 4);
    }

    write(buf, value, offset, littleEndian, 23, 4);
    return offset + 4;
  }

  Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
    return writeFloat(this, value, offset, true, noAssert);
  };

  Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
    return writeFloat(this, value, offset, false, noAssert);
  };

  function writeDouble(buf, value, offset, littleEndian, noAssert) {
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 8);
    }

    write(buf, value, offset, littleEndian, 52, 8);
    return offset + 8;
  }

  Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
    return writeDouble(this, value, offset, true, noAssert);
  };

  Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
    return writeDouble(this, value, offset, false, noAssert);
  }; // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)


  Buffer.prototype.copy = function copy(target, targetStart, start, end) {
    if (!start) start = 0;
    if (!end && end !== 0) end = this.length;
    if (targetStart >= target.length) targetStart = target.length;
    if (!targetStart) targetStart = 0;
    if (end > 0 && end < start) end = start; // Copy 0 bytes; we're done

    if (end === start) return 0;
    if (target.length === 0 || this.length === 0) return 0; // Fatal error conditions

    if (targetStart < 0) {
      throw new RangeError('targetStart out of bounds');
    }

    if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds');
    if (end < 0) throw new RangeError('sourceEnd out of bounds'); // Are we oob?

    if (end > this.length) end = this.length;

    if (target.length - targetStart < end - start) {
      end = target.length - targetStart + start;
    }

    var len = end - start;
    var i;

    if (this === target && start < targetStart && targetStart < end) {
      // descending copy from end
      for (i = len - 1; i >= 0; --i) {
        target[i + targetStart] = this[i + start];
      }
    } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
      // ascending copy from start
      for (i = 0; i < len; ++i) {
        target[i + targetStart] = this[i + start];
      }
    } else {
      Uint8Array.prototype.set.call(target, this.subarray(start, start + len), targetStart);
    }

    return len;
  }; // Usage:
  //    buffer.fill(number[, offset[, end]])
  //    buffer.fill(buffer[, offset[, end]])
  //    buffer.fill(string[, offset[, end]][, encoding])


  Buffer.prototype.fill = function fill(val, start, end, encoding) {
    // Handle string cases:
    if (typeof val === 'string') {
      if (typeof start === 'string') {
        encoding = start;
        start = 0;
        end = this.length;
      } else if (typeof end === 'string') {
        encoding = end;
        end = this.length;
      }

      if (val.length === 1) {
        var code = val.charCodeAt(0);

        if (code < 256) {
          val = code;
        }
      }

      if (encoding !== undefined && typeof encoding !== 'string') {
        throw new TypeError('encoding must be a string');
      }

      if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
        throw new TypeError('Unknown encoding: ' + encoding);
      }
    } else if (typeof val === 'number') {
      val = val & 255;
    } // Invalid ranges are not set to a default, so can range check early.


    if (start < 0 || this.length < start || this.length < end) {
      throw new RangeError('Out of range index');
    }

    if (end <= start) {
      return this;
    }

    start = start >>> 0;
    end = end === undefined ? this.length : end >>> 0;
    if (!val) val = 0;
    var i;

    if (typeof val === 'number') {
      for (i = start; i < end; ++i) {
        this[i] = val;
      }
    } else {
      var bytes = internalIsBuffer(val) ? val : utf8ToBytes(new Buffer(val, encoding).toString());
      var len = bytes.length;

      for (i = 0; i < end - start; ++i) {
        this[i + start] = bytes[i % len];
      }
    }

    return this;
  }; // HELPER FUNCTIONS
  // ================


  var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

  function base64clean(str) {
    // Node strips out invalid characters like \n and \t from the string, base64-js does not
    str = stringtrim(str).replace(INVALID_BASE64_RE, ''); // Node converts strings with length < 2 to ''

    if (str.length < 2) return ''; // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not

    while (str.length % 4 !== 0) {
      str = str + '=';
    }

    return str;
  }

  function stringtrim(str) {
    if (str.trim) return str.trim();
    return str.replace(/^\s+|\s+$/g, '');
  }

  function toHex(n) {
    if (n < 16) return '0' + n.toString(16);
    return n.toString(16);
  }

  function utf8ToBytes(string, units) {
    units = units || Infinity;
    var codePoint;
    var length = string.length;
    var leadSurrogate = null;
    var bytes = [];

    for (var i = 0; i < length; ++i) {
      codePoint = string.charCodeAt(i); // is surrogate component

      if (codePoint > 0xD7FF && codePoint < 0xE000) {
        // last char was a lead
        if (!leadSurrogate) {
          // no lead yet
          if (codePoint > 0xDBFF) {
            // unexpected trail
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            continue;
          } else if (i + 1 === length) {
            // unpaired lead
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            continue;
          } // valid lead


          leadSurrogate = codePoint;
          continue;
        } // 2 leads in a row


        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          leadSurrogate = codePoint;
          continue;
        } // valid surrogate pair


        codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
      } else if (leadSurrogate) {
        // valid bmp char, but last char was a lead
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
      }

      leadSurrogate = null; // encode utf8

      if (codePoint < 0x80) {
        if ((units -= 1) < 0) break;
        bytes.push(codePoint);
      } else if (codePoint < 0x800) {
        if ((units -= 2) < 0) break;
        bytes.push(codePoint >> 0x6 | 0xC0, codePoint & 0x3F | 0x80);
      } else if (codePoint < 0x10000) {
        if ((units -= 3) < 0) break;
        bytes.push(codePoint >> 0xC | 0xE0, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
      } else if (codePoint < 0x110000) {
        if ((units -= 4) < 0) break;
        bytes.push(codePoint >> 0x12 | 0xF0, codePoint >> 0xC & 0x3F | 0x80, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
      } else {
        throw new Error('Invalid code point');
      }
    }

    return bytes;
  }

  function asciiToBytes(str) {
    var byteArray = [];

    for (var i = 0; i < str.length; ++i) {
      // Node's code seems to be doing this and not & 0x7F..
      byteArray.push(str.charCodeAt(i) & 0xFF);
    }

    return byteArray;
  }

  function utf16leToBytes(str, units) {
    var c, hi, lo;
    var byteArray = [];

    for (var i = 0; i < str.length; ++i) {
      if ((units -= 2) < 0) break;
      c = str.charCodeAt(i);
      hi = c >> 8;
      lo = c % 256;
      byteArray.push(lo);
      byteArray.push(hi);
    }

    return byteArray;
  }

  function base64ToBytes(str) {
    return toByteArray(base64clean(str));
  }

  function blitBuffer(src, dst, offset, length) {
    for (var i = 0; i < length; ++i) {
      if (i + offset >= dst.length || i >= src.length) break;
      dst[i + offset] = src[i];
    }

    return i;
  }

  function isnan(val) {
    return val !== val; // eslint-disable-line no-self-compare
  } // the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
  // The _isBuffer check is for Safari 5-7 support, because it's missing
  // Object.prototype.constructor. Remove this eventually


  function isBuffer(obj) {
    return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj));
  }

  function isFastBuffer(obj) {
    return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj);
  } // For Node v0.10 support. Remove this eventually.


  function isSlowBuffer(obj) {
    return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0));
  }

  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
  }

  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf(o, p);
  }

  function _isNativeFunction(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
  }

  function isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;

    try {
      Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function _construct(Parent, args, Class) {
    if (isNativeReflectConstruct()) {
      _construct = Reflect.construct;
    } else {
      _construct = function _construct(Parent, args, Class) {
        var a = [null];
        a.push.apply(a, args);
        var Constructor = Function.bind.apply(Parent, a);
        var instance = new Constructor();
        if (Class) _setPrototypeOf(instance, Class.prototype);
        return instance;
      };
    }

    return _construct.apply(null, arguments);
  }

  function _wrapNativeSuper(Class) {
    var _cache = typeof Map === "function" ? new Map() : undefined;

    _wrapNativeSuper = function _wrapNativeSuper(Class) {
      if (Class === null || !_isNativeFunction(Class)) return Class;

      if (typeof Class !== "function") {
        throw new TypeError("Super expression must either be null or a function");
      }

      if (typeof _cache !== "undefined") {
        if (_cache.has(Class)) return _cache.get(Class);

        _cache.set(Class, Wrapper);
      }

      function Wrapper() {
        return _construct(Class, arguments, _getPrototypeOf(this).constructor);
      }

      Wrapper.prototype = Object.create(Class.prototype, {
        constructor: {
          value: Wrapper,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      return _setPrototypeOf(Wrapper, Class);
    };

    return _wrapNativeSuper(Class);
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  var hexValueType = function hexValueType(input) {
    return input;
  };
  var isHexValue = function isHexValue(value) {
    return typeof value === 'string' && value.slice(0, 2) === '0x';
  };
  var fromHexValue = function fromHexValue(input) {
    return Buffer.from(input.substr(2), 'hex');
  };

  var toHexValue = function toHexValue(value) {
    return hexValueType('0x' + Buffer.from(value).toString('hex'));
  };

  var Hex =
  /*#__PURE__*/
  function () {
    function Hex(inputValue) {
      _defineProperty(this, "_input", void 0);

      _defineProperty(this, "_value", void 0);

      if (inputValue instanceof Hex) {
        return inputValue;
      }

      if (isHexValue(inputValue)) {
        var value = hexValueType(inputValue);
        this._input = {
          type: 'hex',
          value: value
        };
        this._value = value;
      } else {
        if (typeof inputValue === 'string') {
          this._input = {
            type: 'string',
            value: inputValue
          };
          this._value = toHexValue(inputValue);
        } else if (Array.isArray(inputValue)) {
          this._input = {
            type: 'bytesArray',
            value: inputValue
          };
          this._value = toHexValue(inputValue);
        } else if (isBuffer(inputValue)) {
          this._input = {
            type: 'buffer',
            value: inputValue
          };
          this._value = toHexValue(inputValue);
        } else if (typeof inputValue === 'object') {
          this._input = {
            type: 'object',
            value: inputValue
          };
          this._value = toHexValue(JSON.stringify(inputValue));
        } else {
          throw new Error('Invalid input');
        }
      }
    }

    var _proto = Hex.prototype;

    _proto.equals = function equals(other) {
      return new Hex(other).value === this._value;
    };

    _proto.toBuffer = function toBuffer() {
      switch (this._input.type) {
        case 'buffer':
          return this._input.value;

        case 'bytesArray':
        case 'string':
          return Buffer.from(this._input.value);

        case 'hex':
          return fromHexValue(this._input.value);

        case 'object':
          return Buffer.from(JSON.stringify(this._input.value));

        default:
          return Buffer.alloc(0);
      }
    };

    _proto.toBytesArray = function toBytesArray() {
      return this._input.type === 'bytesArray' ? this._input.value : Array.from(this.toBuffer());
    };

    _proto.toObject = function toObject() {
      return this._input.type === 'object' ? this._input.value : JSON.parse(this.toString());
    };

    _proto.toString = function toString() {
      switch (this._input.type) {
        case 'buffer':
          return this._input.value.toString();

        case 'bytesArray':
          return Buffer.from(this._input.value).toString();

        case 'hex':
          return fromHexValue(this._input.value).toString();

        case 'object':
          return JSON.stringify(this._input.value);

        case 'string':
          return this._input.value;

        default:
          return '';
      }
    };

    _createClass(Hex, [{
      key: "value",
      get: function get() {
        return this._value;
      }
    }]);

    return Hex;
  }();
  var createHex = (function (input) {
    return new Hex(input);
  });

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0

  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.

  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** */

  /* global Reflect, Promise */
  var extendStatics = function (d, b) {
    extendStatics = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    };

    return extendStatics(d, b);
  };

  function __extends(d, b) {
    extendStatics(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  }
  var __assign = function () {
    __assign = Object.assign || function __assign(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];

        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }

      return t;
    };

    return __assign.apply(this, arguments);
  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function isFunction(x) {
    return typeof x === 'function';
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var _enable_super_gross_mode_that_will_cause_bad_things = false;
  var config = {
    Promise: undefined,

    set useDeprecatedSynchronousErrorHandling(value) {
      if (value) {
        var error =
        /*@__PURE__*/
        new Error();
        /*@__PURE__*/

        console.warn('DEPRECATED! RxJS was set to use deprecated synchronous error handling behavior by code at: \n' + error.stack);
      }

      _enable_super_gross_mode_that_will_cause_bad_things = value;
    },

    get useDeprecatedSynchronousErrorHandling() {
      return _enable_super_gross_mode_that_will_cause_bad_things;
    }

  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function hostReportError(err) {
    setTimeout(function () {
      throw err;
    }, 0);
  }

  /** PURE_IMPORTS_START _config,_util_hostReportError PURE_IMPORTS_END */
  var empty = {
    closed: true,
    next: function (value) {},
    error: function (err) {
      if (config.useDeprecatedSynchronousErrorHandling) {
        throw err;
      } else {
        hostReportError(err);
      }
    },
    complete: function () {}
  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var isArray$1 = Array.isArray || function (x) {
    return x && typeof x.length === 'number';
  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function isObject(x) {
    return x !== null && typeof x === 'object';
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function UnsubscriptionErrorImpl(errors) {
    Error.call(this);
    this.message = errors ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) {
      return i + 1 + ") " + err.toString();
    }).join('\n  ') : '';
    this.name = 'UnsubscriptionError';
    this.errors = errors;
    return this;
  }

  UnsubscriptionErrorImpl.prototype =
  /*@__PURE__*/
  Object.create(Error.prototype);
  var UnsubscriptionError = UnsubscriptionErrorImpl;

  /** PURE_IMPORTS_START _util_isArray,_util_isObject,_util_isFunction,_util_UnsubscriptionError PURE_IMPORTS_END */

  var Subscription =
  /*@__PURE__*/
  function () {
    function Subscription(unsubscribe) {
      this.closed = false;
      this._parentOrParents = null;
      this._subscriptions = null;

      if (unsubscribe) {
        this._unsubscribe = unsubscribe;
      }
    }

    Subscription.prototype.unsubscribe = function () {
      var errors;

      if (this.closed) {
        return;
      }

      var _a = this,
          _parentOrParents = _a._parentOrParents,
          _unsubscribe = _a._unsubscribe,
          _subscriptions = _a._subscriptions;

      this.closed = true;
      this._parentOrParents = null;
      this._subscriptions = null;

      if (_parentOrParents instanceof Subscription) {
        _parentOrParents.remove(this);
      } else if (_parentOrParents !== null) {
        for (var index = 0; index < _parentOrParents.length; ++index) {
          var parent_1 = _parentOrParents[index];
          parent_1.remove(this);
        }
      }

      if (isFunction(_unsubscribe)) {
        try {
          _unsubscribe.call(this);
        } catch (e) {
          errors = e instanceof UnsubscriptionError ? flattenUnsubscriptionErrors(e.errors) : [e];
        }
      }

      if (isArray$1(_subscriptions)) {
        var index = -1;
        var len = _subscriptions.length;

        while (++index < len) {
          var sub = _subscriptions[index];

          if (isObject(sub)) {
            try {
              sub.unsubscribe();
            } catch (e) {
              errors = errors || [];

              if (e instanceof UnsubscriptionError) {
                errors = errors.concat(flattenUnsubscriptionErrors(e.errors));
              } else {
                errors.push(e);
              }
            }
          }
        }
      }

      if (errors) {
        throw new UnsubscriptionError(errors);
      }
    };

    Subscription.prototype.add = function (teardown) {
      var subscription = teardown;

      if (!teardown) {
        return Subscription.EMPTY;
      }

      switch (typeof teardown) {
        case 'function':
          subscription = new Subscription(teardown);

        case 'object':
          if (subscription === this || subscription.closed || typeof subscription.unsubscribe !== 'function') {
            return subscription;
          } else if (this.closed) {
            subscription.unsubscribe();
            return subscription;
          } else if (!(subscription instanceof Subscription)) {
            var tmp = subscription;
            subscription = new Subscription();
            subscription._subscriptions = [tmp];
          }

          break;

        default:
          {
            throw new Error('unrecognized teardown ' + teardown + ' added to Subscription.');
          }
      }

      var _parentOrParents = subscription._parentOrParents;

      if (_parentOrParents === null) {
        subscription._parentOrParents = this;
      } else if (_parentOrParents instanceof Subscription) {
        if (_parentOrParents === this) {
          return subscription;
        }

        subscription._parentOrParents = [_parentOrParents, this];
      } else if (_parentOrParents.indexOf(this) === -1) {
        _parentOrParents.push(this);
      } else {
        return subscription;
      }

      var subscriptions = this._subscriptions;

      if (subscriptions === null) {
        this._subscriptions = [subscription];
      } else {
        subscriptions.push(subscription);
      }

      return subscription;
    };

    Subscription.prototype.remove = function (subscription) {
      var subscriptions = this._subscriptions;

      if (subscriptions) {
        var subscriptionIndex = subscriptions.indexOf(subscription);

        if (subscriptionIndex !== -1) {
          subscriptions.splice(subscriptionIndex, 1);
        }
      }
    };

    Subscription.EMPTY = function (empty) {
      empty.closed = true;
      return empty;
    }(new Subscription());

    return Subscription;
  }();

  function flattenUnsubscriptionErrors(errors) {
    return errors.reduce(function (errs, err) {
      return errs.concat(err instanceof UnsubscriptionError ? err.errors : err);
    }, []);
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var rxSubscriber = typeof Symbol === 'function' ?
  /*@__PURE__*/
  Symbol('rxSubscriber') : '@@rxSubscriber_' +
  /*@__PURE__*/
  Math.random();

  /** PURE_IMPORTS_START tslib,_util_isFunction,_Observer,_Subscription,_internal_symbol_rxSubscriber,_config,_util_hostReportError PURE_IMPORTS_END */

  var Subscriber =
  /*@__PURE__*/
  function (_super) {
    __extends(Subscriber, _super);

    function Subscriber(destinationOrNext, error, complete) {
      var _this = _super.call(this) || this;

      _this.syncErrorValue = null;
      _this.syncErrorThrown = false;
      _this.syncErrorThrowable = false;
      _this.isStopped = false;

      switch (arguments.length) {
        case 0:
          _this.destination = empty;
          break;

        case 1:
          if (!destinationOrNext) {
            _this.destination = empty;
            break;
          }

          if (typeof destinationOrNext === 'object') {
            if (destinationOrNext instanceof Subscriber) {
              _this.syncErrorThrowable = destinationOrNext.syncErrorThrowable;
              _this.destination = destinationOrNext;
              destinationOrNext.add(_this);
            } else {
              _this.syncErrorThrowable = true;
              _this.destination = new SafeSubscriber(_this, destinationOrNext);
            }

            break;
          }

        default:
          _this.syncErrorThrowable = true;
          _this.destination = new SafeSubscriber(_this, destinationOrNext, error, complete);
          break;
      }

      return _this;
    }

    Subscriber.prototype[rxSubscriber] = function () {
      return this;
    };

    Subscriber.create = function (next, error, complete) {
      var subscriber = new Subscriber(next, error, complete);
      subscriber.syncErrorThrowable = false;
      return subscriber;
    };

    Subscriber.prototype.next = function (value) {
      if (!this.isStopped) {
        this._next(value);
      }
    };

    Subscriber.prototype.error = function (err) {
      if (!this.isStopped) {
        this.isStopped = true;

        this._error(err);
      }
    };

    Subscriber.prototype.complete = function () {
      if (!this.isStopped) {
        this.isStopped = true;

        this._complete();
      }
    };

    Subscriber.prototype.unsubscribe = function () {
      if (this.closed) {
        return;
      }

      this.isStopped = true;

      _super.prototype.unsubscribe.call(this);
    };

    Subscriber.prototype._next = function (value) {
      this.destination.next(value);
    };

    Subscriber.prototype._error = function (err) {
      this.destination.error(err);
      this.unsubscribe();
    };

    Subscriber.prototype._complete = function () {
      this.destination.complete();
      this.unsubscribe();
    };

    Subscriber.prototype._unsubscribeAndRecycle = function () {
      var _parentOrParents = this._parentOrParents;
      this._parentOrParents = null;
      this.unsubscribe();
      this.closed = false;
      this.isStopped = false;
      this._parentOrParents = _parentOrParents;
      return this;
    };

    return Subscriber;
  }(Subscription);

  var SafeSubscriber =
  /*@__PURE__*/
  function (_super) {
    __extends(SafeSubscriber, _super);

    function SafeSubscriber(_parentSubscriber, observerOrNext, error, complete) {
      var _this = _super.call(this) || this;

      _this._parentSubscriber = _parentSubscriber;
      var next;
      var context = _this;

      if (isFunction(observerOrNext)) {
        next = observerOrNext;
      } else if (observerOrNext) {
        next = observerOrNext.next;
        error = observerOrNext.error;
        complete = observerOrNext.complete;

        if (observerOrNext !== empty) {
          context = Object.create(observerOrNext);

          if (isFunction(context.unsubscribe)) {
            _this.add(context.unsubscribe.bind(context));
          }

          context.unsubscribe = _this.unsubscribe.bind(_this);
        }
      }

      _this._context = context;
      _this._next = next;
      _this._error = error;
      _this._complete = complete;
      return _this;
    }

    SafeSubscriber.prototype.next = function (value) {
      if (!this.isStopped && this._next) {
        var _parentSubscriber = this._parentSubscriber;

        if (!config.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
          this.__tryOrUnsub(this._next, value);
        } else if (this.__tryOrSetError(_parentSubscriber, this._next, value)) {
          this.unsubscribe();
        }
      }
    };

    SafeSubscriber.prototype.error = function (err) {
      if (!this.isStopped) {
        var _parentSubscriber = this._parentSubscriber;
        var useDeprecatedSynchronousErrorHandling = config.useDeprecatedSynchronousErrorHandling;

        if (this._error) {
          if (!useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
            this.__tryOrUnsub(this._error, err);

            this.unsubscribe();
          } else {
            this.__tryOrSetError(_parentSubscriber, this._error, err);

            this.unsubscribe();
          }
        } else if (!_parentSubscriber.syncErrorThrowable) {
          this.unsubscribe();

          if (useDeprecatedSynchronousErrorHandling) {
            throw err;
          }

          hostReportError(err);
        } else {
          if (useDeprecatedSynchronousErrorHandling) {
            _parentSubscriber.syncErrorValue = err;
            _parentSubscriber.syncErrorThrown = true;
          } else {
            hostReportError(err);
          }

          this.unsubscribe();
        }
      }
    };

    SafeSubscriber.prototype.complete = function () {
      var _this = this;

      if (!this.isStopped) {
        var _parentSubscriber = this._parentSubscriber;

        if (this._complete) {
          var wrappedComplete = function () {
            return _this._complete.call(_this._context);
          };

          if (!config.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
            this.__tryOrUnsub(wrappedComplete);

            this.unsubscribe();
          } else {
            this.__tryOrSetError(_parentSubscriber, wrappedComplete);

            this.unsubscribe();
          }
        } else {
          this.unsubscribe();
        }
      }
    };

    SafeSubscriber.prototype.__tryOrUnsub = function (fn, value) {
      try {
        fn.call(this._context, value);
      } catch (err) {
        this.unsubscribe();

        if (config.useDeprecatedSynchronousErrorHandling) {
          throw err;
        } else {
          hostReportError(err);
        }
      }
    };

    SafeSubscriber.prototype.__tryOrSetError = function (parent, fn, value) {
      if (!config.useDeprecatedSynchronousErrorHandling) {
        throw new Error('bad call');
      }

      try {
        fn.call(this._context, value);
      } catch (err) {
        if (config.useDeprecatedSynchronousErrorHandling) {
          parent.syncErrorValue = err;
          parent.syncErrorThrown = true;
          return true;
        } else {
          hostReportError(err);
          return true;
        }
      }

      return false;
    };

    SafeSubscriber.prototype._unsubscribe = function () {
      var _parentSubscriber = this._parentSubscriber;
      this._context = null;
      this._parentSubscriber = null;

      _parentSubscriber.unsubscribe();
    };

    return SafeSubscriber;
  }(Subscriber);

  /** PURE_IMPORTS_START _Subscriber PURE_IMPORTS_END */
  function canReportError(observer) {
    while (observer) {
      var _a = observer,
          closed_1 = _a.closed,
          destination = _a.destination,
          isStopped = _a.isStopped;

      if (closed_1 || isStopped) {
        return false;
      } else if (destination && destination instanceof Subscriber) {
        observer = destination;
      } else {
        observer = null;
      }
    }

    return true;
  }

  /** PURE_IMPORTS_START _Subscriber,_symbol_rxSubscriber,_Observer PURE_IMPORTS_END */
  function toSubscriber(nextOrObserver, error, complete) {
    if (nextOrObserver) {
      if (nextOrObserver instanceof Subscriber) {
        return nextOrObserver;
      }

      if (nextOrObserver[rxSubscriber]) {
        return nextOrObserver[rxSubscriber]();
      }
    }

    if (!nextOrObserver && !error && !complete) {
      return new Subscriber(empty);
    }

    return new Subscriber(nextOrObserver, error, complete);
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var observable = typeof Symbol === 'function' && Symbol.observable || '@@observable';

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function noop() {}

  /** PURE_IMPORTS_START _noop PURE_IMPORTS_END */
  function pipeFromArray(fns) {
    if (!fns) {
      return noop;
    }

    if (fns.length === 1) {
      return fns[0];
    }

    return function piped(input) {
      return fns.reduce(function (prev, fn) {
        return fn(prev);
      }, input);
    };
  }

  /** PURE_IMPORTS_START _util_canReportError,_util_toSubscriber,_symbol_observable,_util_pipe,_config PURE_IMPORTS_END */

  var Observable =
  /*@__PURE__*/
  function () {
    function Observable(subscribe) {
      this._isScalar = false;

      if (subscribe) {
        this._subscribe = subscribe;
      }
    }

    Observable.prototype.lift = function (operator) {
      var observable = new Observable();
      observable.source = this;
      observable.operator = operator;
      return observable;
    };

    Observable.prototype.subscribe = function (observerOrNext, error, complete) {
      var operator = this.operator;
      var sink = toSubscriber(observerOrNext, error, complete);

      if (operator) {
        sink.add(operator.call(sink, this.source));
      } else {
        sink.add(this.source || config.useDeprecatedSynchronousErrorHandling && !sink.syncErrorThrowable ? this._subscribe(sink) : this._trySubscribe(sink));
      }

      if (config.useDeprecatedSynchronousErrorHandling) {
        if (sink.syncErrorThrowable) {
          sink.syncErrorThrowable = false;

          if (sink.syncErrorThrown) {
            throw sink.syncErrorValue;
          }
        }
      }

      return sink;
    };

    Observable.prototype._trySubscribe = function (sink) {
      try {
        return this._subscribe(sink);
      } catch (err) {
        if (config.useDeprecatedSynchronousErrorHandling) {
          sink.syncErrorThrown = true;
          sink.syncErrorValue = err;
        }

        if (canReportError(sink)) {
          sink.error(err);
        } else {
          console.warn(err);
        }
      }
    };

    Observable.prototype.forEach = function (next, promiseCtor) {
      var _this = this;

      promiseCtor = getPromiseCtor(promiseCtor);
      return new promiseCtor(function (resolve, reject) {
        var subscription;
        subscription = _this.subscribe(function (value) {
          try {
            next(value);
          } catch (err) {
            reject(err);

            if (subscription) {
              subscription.unsubscribe();
            }
          }
        }, reject, resolve);
      });
    };

    Observable.prototype._subscribe = function (subscriber) {
      var source = this.source;
      return source && source.subscribe(subscriber);
    };

    Observable.prototype[observable] = function () {
      return this;
    };

    Observable.prototype.pipe = function () {
      var operations = [];

      for (var _i = 0; _i < arguments.length; _i++) {
        operations[_i] = arguments[_i];
      }

      if (operations.length === 0) {
        return this;
      }

      return pipeFromArray(operations)(this);
    };

    Observable.prototype.toPromise = function (promiseCtor) {
      var _this = this;

      promiseCtor = getPromiseCtor(promiseCtor);
      return new promiseCtor(function (resolve, reject) {
        var value;

        _this.subscribe(function (x) {
          return value = x;
        }, function (err) {
          return reject(err);
        }, function () {
          return resolve(value);
        });
      });
    };

    Observable.create = function (subscribe) {
      return new Observable(subscribe);
    };

    return Observable;
  }();

  function getPromiseCtor(promiseCtor) {
    if (!promiseCtor) {
      promiseCtor = Promise;
    }

    if (!promiseCtor) {
      throw new Error('no Promise impl found');
    }

    return promiseCtor;
  }

  /** PURE_IMPORTS_START tslib,_Subscription PURE_IMPORTS_END */

  var Action =
  /*@__PURE__*/
  function (_super) {
    __extends(Action, _super);

    function Action(scheduler, work) {
      return _super.call(this) || this;
    }

    Action.prototype.schedule = function (state, delay) {

      return this;
    };

    return Action;
  }(Subscription);

  /** PURE_IMPORTS_START tslib,_Action PURE_IMPORTS_END */

  var AsyncAction =
  /*@__PURE__*/
  function (_super) {
    __extends(AsyncAction, _super);

    function AsyncAction(scheduler, work) {
      var _this = _super.call(this, scheduler, work) || this;

      _this.scheduler = scheduler;
      _this.work = work;
      _this.pending = false;
      return _this;
    }

    AsyncAction.prototype.schedule = function (state, delay) {
      if (delay === void 0) {
        delay = 0;
      }

      if (this.closed) {
        return this;
      }

      this.state = state;
      var id = this.id;
      var scheduler = this.scheduler;

      if (id != null) {
        this.id = this.recycleAsyncId(scheduler, id, delay);
      }

      this.pending = true;
      this.delay = delay;
      this.id = this.id || this.requestAsyncId(scheduler, this.id, delay);
      return this;
    };

    AsyncAction.prototype.requestAsyncId = function (scheduler, id, delay) {
      if (delay === void 0) {
        delay = 0;
      }

      return setInterval(scheduler.flush.bind(scheduler, this), delay);
    };

    AsyncAction.prototype.recycleAsyncId = function (scheduler, id, delay) {
      if (delay === void 0) {
        delay = 0;
      }

      if (delay !== null && this.delay === delay && this.pending === false) {
        return id;
      }

      clearInterval(id);
      return undefined;
    };

    AsyncAction.prototype.execute = function (state, delay) {
      if (this.closed) {
        return new Error('executing a cancelled action');
      }

      this.pending = false;

      var error = this._execute(state, delay);

      if (error) {
        return error;
      } else if (this.pending === false && this.id != null) {
        this.id = this.recycleAsyncId(this.scheduler, this.id, null);
      }
    };

    AsyncAction.prototype._execute = function (state, delay) {
      var errored = false;
      var errorValue = undefined;

      try {
        this.work(state);
      } catch (e) {
        errored = true;
        errorValue = !!e && e || new Error(e);
      }

      if (errored) {
        this.unsubscribe();
        return errorValue;
      }
    };

    AsyncAction.prototype._unsubscribe = function () {
      var id = this.id;
      var scheduler = this.scheduler;
      var actions = scheduler.actions;
      var index = actions.indexOf(this);
      this.work = null;
      this.state = null;
      this.pending = false;
      this.scheduler = null;

      if (index !== -1) {
        actions.splice(index, 1);
      }

      if (id != null) {
        this.id = this.recycleAsyncId(scheduler, id, null);
      }

      this.delay = null;
    };

    return AsyncAction;
  }(Action);

  var Scheduler =
  /*@__PURE__*/
  function () {
    function Scheduler(SchedulerAction, now) {
      if (now === void 0) {
        now = Scheduler.now;
      }

      this.SchedulerAction = SchedulerAction;
      this.now = now;
    }

    Scheduler.prototype.schedule = function (work, delay, state) {
      if (delay === void 0) {
        delay = 0;
      }

      return new this.SchedulerAction(this, work).schedule(state, delay);
    };

    Scheduler.now = function () {
      return Date.now();
    };

    return Scheduler;
  }();

  /** PURE_IMPORTS_START tslib,_Scheduler PURE_IMPORTS_END */

  var AsyncScheduler =
  /*@__PURE__*/
  function (_super) {
    __extends(AsyncScheduler, _super);

    function AsyncScheduler(SchedulerAction, now) {
      if (now === void 0) {
        now = Scheduler.now;
      }

      var _this = _super.call(this, SchedulerAction, function () {
        if (AsyncScheduler.delegate && AsyncScheduler.delegate !== _this) {
          return AsyncScheduler.delegate.now();
        } else {
          return now();
        }
      }) || this;

      _this.actions = [];
      _this.active = false;
      _this.scheduled = undefined;
      return _this;
    }

    AsyncScheduler.prototype.schedule = function (work, delay, state) {
      if (delay === void 0) {
        delay = 0;
      }

      if (AsyncScheduler.delegate && AsyncScheduler.delegate !== this) {
        return AsyncScheduler.delegate.schedule(work, delay, state);
      } else {
        return _super.prototype.schedule.call(this, work, delay, state);
      }
    };

    AsyncScheduler.prototype.flush = function (action) {
      var actions = this.actions;

      if (this.active) {
        actions.push(action);
        return;
      }

      var error;
      this.active = true;

      do {
        if (error = action.execute(action.state, action.delay)) {
          break;
        }
      } while (action = actions.shift());

      this.active = false;

      if (error) {
        while (action = actions.shift()) {
          action.unsubscribe();
        }

        throw error;
      }
    };

    return AsyncScheduler;
  }(Scheduler);

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function isScheduler(value) {
    return value && typeof value.schedule === 'function';
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var subscribeToArray = function (array) {
    return function (subscriber) {
      for (var i = 0, len = array.length; i < len && !subscriber.closed; i++) {
        subscriber.next(array[i]);
      }

      subscriber.complete();
    };
  };

  /** PURE_IMPORTS_START _Observable,_Subscription PURE_IMPORTS_END */
  function scheduleArray(input, scheduler) {
    return new Observable(function (subscriber) {
      var sub = new Subscription();
      var i = 0;
      sub.add(scheduler.schedule(function () {
        if (i === input.length) {
          subscriber.complete();
          return;
        }

        subscriber.next(input[i++]);

        if (!subscriber.closed) {
          sub.add(this.schedule());
        }
      }));
      return sub;
    });
  }

  /** PURE_IMPORTS_START _Observable,_util_subscribeToArray,_scheduled_scheduleArray PURE_IMPORTS_END */
  function fromArray(input, scheduler) {
    if (!scheduler) {
      return new Observable(subscribeToArray(input));
    } else {
      return scheduleArray(input, scheduler);
    }
  }

  /** PURE_IMPORTS_START _AsyncAction,_AsyncScheduler PURE_IMPORTS_END */
  var async =
  /*@__PURE__*/
  new AsyncScheduler(AsyncAction);

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function identity(x) {
    return x;
  }

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */
  function map(project, thisArg) {
    return function mapOperation(source) {
      if (typeof project !== 'function') {
        throw new TypeError('argument is not a function. Are you looking for `mapTo()`?');
      }

      return source.lift(new MapOperator(project, thisArg));
    };
  }

  var MapOperator =
  /*@__PURE__*/
  function () {
    function MapOperator(project, thisArg) {
      this.project = project;
      this.thisArg = thisArg;
    }

    MapOperator.prototype.call = function (subscriber, source) {
      return source.subscribe(new MapSubscriber(subscriber, this.project, this.thisArg));
    };

    return MapOperator;
  }();

  var MapSubscriber =
  /*@__PURE__*/
  function (_super) {
    __extends(MapSubscriber, _super);

    function MapSubscriber(destination, project, thisArg) {
      var _this = _super.call(this, destination) || this;

      _this.project = project;
      _this.count = 0;
      _this.thisArg = thisArg || _this;
      return _this;
    }

    MapSubscriber.prototype._next = function (value) {
      var result;

      try {
        result = this.project.call(this.thisArg, value, this.count++);
      } catch (err) {
        this.destination.error(err);
        return;
      }

      this.destination.next(result);
    };

    return MapSubscriber;
  }(Subscriber);

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  var OuterSubscriber =
  /*@__PURE__*/
  function (_super) {
    __extends(OuterSubscriber, _super);

    function OuterSubscriber() {
      return _super !== null && _super.apply(this, arguments) || this;
    }

    OuterSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
      this.destination.next(innerValue);
    };

    OuterSubscriber.prototype.notifyError = function (error, innerSub) {
      this.destination.error(error);
    };

    OuterSubscriber.prototype.notifyComplete = function (innerSub) {
      this.destination.complete();
    };

    return OuterSubscriber;
  }(Subscriber);

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  var InnerSubscriber =
  /*@__PURE__*/
  function (_super) {
    __extends(InnerSubscriber, _super);

    function InnerSubscriber(parent, outerValue, outerIndex) {
      var _this = _super.call(this) || this;

      _this.parent = parent;
      _this.outerValue = outerValue;
      _this.outerIndex = outerIndex;
      _this.index = 0;
      return _this;
    }

    InnerSubscriber.prototype._next = function (value) {
      this.parent.notifyNext(this.outerValue, value, this.outerIndex, this.index++, this);
    };

    InnerSubscriber.prototype._error = function (error) {
      this.parent.notifyError(error, this);
      this.unsubscribe();
    };

    InnerSubscriber.prototype._complete = function () {
      this.parent.notifyComplete(this);
      this.unsubscribe();
    };

    return InnerSubscriber;
  }(Subscriber);

  /** PURE_IMPORTS_START _hostReportError PURE_IMPORTS_END */
  var subscribeToPromise = function (promise) {
    return function (subscriber) {
      promise.then(function (value) {
        if (!subscriber.closed) {
          subscriber.next(value);
          subscriber.complete();
        }
      }, function (err) {
        return subscriber.error(err);
      }).then(null, hostReportError);
      return subscriber;
    };
  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function getSymbolIterator() {
    if (typeof Symbol !== 'function' || !Symbol.iterator) {
      return '@@iterator';
    }

    return Symbol.iterator;
  }
  var iterator =
  /*@__PURE__*/
  getSymbolIterator();

  /** PURE_IMPORTS_START _symbol_iterator PURE_IMPORTS_END */
  var subscribeToIterable = function (iterable) {
    return function (subscriber) {
      var iterator$1 = iterable[iterator]();

      do {
        var item = iterator$1.next();

        if (item.done) {
          subscriber.complete();
          break;
        }

        subscriber.next(item.value);

        if (subscriber.closed) {
          break;
        }
      } while (true);

      if (typeof iterator$1.return === 'function') {
        subscriber.add(function () {
          if (iterator$1.return) {
            iterator$1.return();
          }
        });
      }

      return subscriber;
    };
  };

  /** PURE_IMPORTS_START _symbol_observable PURE_IMPORTS_END */
  var subscribeToObservable = function (obj) {
    return function (subscriber) {
      var obs = obj[observable]();

      if (typeof obs.subscribe !== 'function') {
        throw new TypeError('Provided object does not correctly implement Symbol.observable');
      } else {
        return obs.subscribe(subscriber);
      }
    };
  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var isArrayLike = function (x) {
    return x && typeof x.length === 'number' && typeof x !== 'function';
  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function isPromise(value) {
    return !!value && typeof value.subscribe !== 'function' && typeof value.then === 'function';
  }

  /** PURE_IMPORTS_START _subscribeToArray,_subscribeToPromise,_subscribeToIterable,_subscribeToObservable,_isArrayLike,_isPromise,_isObject,_symbol_iterator,_symbol_observable PURE_IMPORTS_END */
  var subscribeTo = function (result) {
    if (!!result && typeof result[observable] === 'function') {
      return subscribeToObservable(result);
    } else if (isArrayLike(result)) {
      return subscribeToArray(result);
    } else if (isPromise(result)) {
      return subscribeToPromise(result);
    } else if (!!result && typeof result[iterator] === 'function') {
      return subscribeToIterable(result);
    } else {
      var value = isObject(result) ? 'an invalid object' : "'" + result + "'";
      var msg = "You provided " + value + " where a stream was expected." + ' You can provide an Observable, Promise, Array, or Iterable.';
      throw new TypeError(msg);
    }
  };

  /** PURE_IMPORTS_START _InnerSubscriber,_subscribeTo,_Observable PURE_IMPORTS_END */
  function subscribeToResult(outerSubscriber, result, outerValue, outerIndex, destination) {
    if (destination === void 0) {
      destination = new InnerSubscriber(outerSubscriber, outerValue, outerIndex);
    }

    if (destination.closed) {
      return undefined;
    }

    if (result instanceof Observable) {
      return result.subscribe(destination);
    }

    return subscribeTo(result)(destination);
  }

  /** PURE_IMPORTS_START _Observable,_Subscription,_symbol_observable PURE_IMPORTS_END */
  function scheduleObservable(input, scheduler) {
    return new Observable(function (subscriber) {
      var sub = new Subscription();
      sub.add(scheduler.schedule(function () {
        var observable$1 = input[observable]();
        sub.add(observable$1.subscribe({
          next: function (value) {
            sub.add(scheduler.schedule(function () {
              return subscriber.next(value);
            }));
          },
          error: function (err) {
            sub.add(scheduler.schedule(function () {
              return subscriber.error(err);
            }));
          },
          complete: function () {
            sub.add(scheduler.schedule(function () {
              return subscriber.complete();
            }));
          }
        }));
      }));
      return sub;
    });
  }

  /** PURE_IMPORTS_START _Observable,_Subscription PURE_IMPORTS_END */
  function schedulePromise(input, scheduler) {
    return new Observable(function (subscriber) {
      var sub = new Subscription();
      sub.add(scheduler.schedule(function () {
        return input.then(function (value) {
          sub.add(scheduler.schedule(function () {
            subscriber.next(value);
            sub.add(scheduler.schedule(function () {
              return subscriber.complete();
            }));
          }));
        }, function (err) {
          sub.add(scheduler.schedule(function () {
            return subscriber.error(err);
          }));
        });
      }));
      return sub;
    });
  }

  /** PURE_IMPORTS_START _Observable,_Subscription,_symbol_iterator PURE_IMPORTS_END */
  function scheduleIterable(input, scheduler) {
    if (!input) {
      throw new Error('Iterable cannot be null');
    }

    return new Observable(function (subscriber) {
      var sub = new Subscription();
      var iterator$1;
      sub.add(function () {
        if (iterator$1 && typeof iterator$1.return === 'function') {
          iterator$1.return();
        }
      });
      sub.add(scheduler.schedule(function () {
        iterator$1 = input[iterator]();
        sub.add(scheduler.schedule(function () {
          if (subscriber.closed) {
            return;
          }

          var value;
          var done;

          try {
            var result = iterator$1.next();
            value = result.value;
            done = result.done;
          } catch (err) {
            subscriber.error(err);
            return;
          }

          if (done) {
            subscriber.complete();
          } else {
            subscriber.next(value);
            this.schedule();
          }
        }));
      }));
      return sub;
    });
  }

  /** PURE_IMPORTS_START _symbol_observable PURE_IMPORTS_END */
  function isInteropObservable(input) {
    return input && typeof input[observable] === 'function';
  }

  /** PURE_IMPORTS_START _symbol_iterator PURE_IMPORTS_END */
  function isIterable(input) {
    return input && typeof input[iterator] === 'function';
  }

  /** PURE_IMPORTS_START _scheduleObservable,_schedulePromise,_scheduleArray,_scheduleIterable,_util_isInteropObservable,_util_isPromise,_util_isArrayLike,_util_isIterable PURE_IMPORTS_END */
  function scheduled(input, scheduler) {
    if (input != null) {
      if (isInteropObservable(input)) {
        return scheduleObservable(input, scheduler);
      } else if (isPromise(input)) {
        return schedulePromise(input, scheduler);
      } else if (isArrayLike(input)) {
        return scheduleArray(input, scheduler);
      } else if (isIterable(input) || typeof input === 'string') {
        return scheduleIterable(input, scheduler);
      }
    }

    throw new TypeError((input !== null && typeof input || input) + ' is not observable');
  }

  /** PURE_IMPORTS_START _Observable,_util_subscribeTo,_scheduled_scheduled PURE_IMPORTS_END */
  function from$1(input, scheduler) {
    if (!scheduler) {
      if (input instanceof Observable) {
        return input;
      }

      return new Observable(subscribeTo(input));
    } else {
      return scheduled(input, scheduler);
    }
  }

  /** PURE_IMPORTS_START tslib,_util_subscribeToResult,_OuterSubscriber,_InnerSubscriber,_map,_observable_from PURE_IMPORTS_END */
  function mergeMap(project, resultSelector, concurrent) {
    if (concurrent === void 0) {
      concurrent = Number.POSITIVE_INFINITY;
    }

    if (typeof resultSelector === 'function') {
      return function (source) {
        return source.pipe(mergeMap(function (a, i) {
          return from$1(project(a, i)).pipe(map(function (b, ii) {
            return resultSelector(a, b, i, ii);
          }));
        }, concurrent));
      };
    } else if (typeof resultSelector === 'number') {
      concurrent = resultSelector;
    }

    return function (source) {
      return source.lift(new MergeMapOperator(project, concurrent));
    };
  }

  var MergeMapOperator =
  /*@__PURE__*/
  function () {
    function MergeMapOperator(project, concurrent) {
      if (concurrent === void 0) {
        concurrent = Number.POSITIVE_INFINITY;
      }

      this.project = project;
      this.concurrent = concurrent;
    }

    MergeMapOperator.prototype.call = function (observer, source) {
      return source.subscribe(new MergeMapSubscriber(observer, this.project, this.concurrent));
    };

    return MergeMapOperator;
  }();

  var MergeMapSubscriber =
  /*@__PURE__*/
  function (_super) {
    __extends(MergeMapSubscriber, _super);

    function MergeMapSubscriber(destination, project, concurrent) {
      if (concurrent === void 0) {
        concurrent = Number.POSITIVE_INFINITY;
      }

      var _this = _super.call(this, destination) || this;

      _this.project = project;
      _this.concurrent = concurrent;
      _this.hasCompleted = false;
      _this.buffer = [];
      _this.active = 0;
      _this.index = 0;
      return _this;
    }

    MergeMapSubscriber.prototype._next = function (value) {
      if (this.active < this.concurrent) {
        this._tryNext(value);
      } else {
        this.buffer.push(value);
      }
    };

    MergeMapSubscriber.prototype._tryNext = function (value) {
      var result;
      var index = this.index++;

      try {
        result = this.project(value, index);
      } catch (err) {
        this.destination.error(err);
        return;
      }

      this.active++;

      this._innerSub(result, value, index);
    };

    MergeMapSubscriber.prototype._innerSub = function (ish, value, index) {
      var innerSubscriber = new InnerSubscriber(this, undefined, undefined);
      var destination = this.destination;
      destination.add(innerSubscriber);
      subscribeToResult(this, ish, value, index, innerSubscriber);
    };

    MergeMapSubscriber.prototype._complete = function () {
      this.hasCompleted = true;

      if (this.active === 0 && this.buffer.length === 0) {
        this.destination.complete();
      }

      this.unsubscribe();
    };

    MergeMapSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
      this.destination.next(innerValue);
    };

    MergeMapSubscriber.prototype.notifyComplete = function (innerSub) {
      var buffer = this.buffer;
      this.remove(innerSub);
      this.active--;

      if (buffer.length > 0) {
        this._next(buffer.shift());
      } else if (this.active === 0 && this.hasCompleted) {
        this.destination.complete();
      }
    };

    return MergeMapSubscriber;
  }(OuterSubscriber);

  /** PURE_IMPORTS_START _mergeMap,_util_identity PURE_IMPORTS_END */
  function mergeAll(concurrent) {
    if (concurrent === void 0) {
      concurrent = Number.POSITIVE_INFINITY;
    }

    return mergeMap(identity, concurrent);
  }

  /** PURE_IMPORTS_START _isArray PURE_IMPORTS_END */
  function isNumeric(val) {
    return !isArray$1(val) && val - parseFloat(val) + 1 >= 0;
  }

  /** PURE_IMPORTS_START _Observable,_scheduler_async,_util_isNumeric PURE_IMPORTS_END */
  function interval(period, scheduler) {
    if (period === void 0) {
      period = 0;
    }

    if (scheduler === void 0) {
      scheduler = async;
    }

    if (!isNumeric(period) || period < 0) {
      period = 0;
    }

    if (!scheduler || typeof scheduler.schedule !== 'function') {
      scheduler = async;
    }

    return new Observable(function (subscriber) {
      subscriber.add(scheduler.schedule(dispatch, period, {
        subscriber: subscriber,
        counter: 0,
        period: period
      }));
      return subscriber;
    });
  }

  function dispatch(state) {
    var subscriber = state.subscriber,
        counter = state.counter,
        period = state.period;
    subscriber.next(counter);
    this.schedule({
      subscriber: subscriber,
      counter: counter + 1,
      period: period
    }, period);
  }

  /** PURE_IMPORTS_START _Observable,_util_isScheduler,_operators_mergeAll,_fromArray PURE_IMPORTS_END */
  function merge() {
    var observables = [];

    for (var _i = 0; _i < arguments.length; _i++) {
      observables[_i] = arguments[_i];
    }

    var concurrent = Number.POSITIVE_INFINITY;
    var scheduler = null;
    var last = observables[observables.length - 1];

    if (isScheduler(last)) {
      scheduler = observables.pop();

      if (observables.length > 1 && typeof observables[observables.length - 1] === 'number') {
        concurrent = observables.pop();
      }
    } else if (typeof last === 'number') {
      concurrent = observables.pop();
    }

    if (scheduler === null && observables.length === 1 && observables[0] instanceof Observable) {
      return observables[0];
    }

    return mergeAll(concurrent)(fromArray(observables, scheduler));
  }

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */
  function filter(predicate, thisArg) {
    return function filterOperatorFunction(source) {
      return source.lift(new FilterOperator(predicate, thisArg));
    };
  }

  var FilterOperator =
  /*@__PURE__*/
  function () {
    function FilterOperator(predicate, thisArg) {
      this.predicate = predicate;
      this.thisArg = thisArg;
    }

    FilterOperator.prototype.call = function (subscriber, source) {
      return source.subscribe(new FilterSubscriber(subscriber, this.predicate, this.thisArg));
    };

    return FilterOperator;
  }();

  var FilterSubscriber =
  /*@__PURE__*/
  function (_super) {
    __extends(FilterSubscriber, _super);

    function FilterSubscriber(destination, predicate, thisArg) {
      var _this = _super.call(this, destination) || this;

      _this.predicate = predicate;
      _this.thisArg = thisArg;
      _this.count = 0;
      return _this;
    }

    FilterSubscriber.prototype._next = function (value) {
      var result;

      try {
        result = this.predicate.call(this.thisArg, value, this.count++);
      } catch (err) {
        this.destination.error(err);
        return;
      }

      if (result) {
        this.destination.next(value);
      }
    };

    return FilterSubscriber;
  }(Subscriber);

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */
  function distinctUntilChanged(compare, keySelector) {
    return function (source) {
      return source.lift(new DistinctUntilChangedOperator(compare, keySelector));
    };
  }

  var DistinctUntilChangedOperator =
  /*@__PURE__*/
  function () {
    function DistinctUntilChangedOperator(compare, keySelector) {
      this.compare = compare;
      this.keySelector = keySelector;
    }

    DistinctUntilChangedOperator.prototype.call = function (subscriber, source) {
      return source.subscribe(new DistinctUntilChangedSubscriber(subscriber, this.compare, this.keySelector));
    };

    return DistinctUntilChangedOperator;
  }();

  var DistinctUntilChangedSubscriber =
  /*@__PURE__*/
  function (_super) {
    __extends(DistinctUntilChangedSubscriber, _super);

    function DistinctUntilChangedSubscriber(destination, compare, keySelector) {
      var _this = _super.call(this, destination) || this;

      _this.keySelector = keySelector;
      _this.hasKey = false;

      if (typeof compare === 'function') {
        _this.compare = compare;
      }

      return _this;
    }

    DistinctUntilChangedSubscriber.prototype.compare = function (x, y) {
      return x === y;
    };

    DistinctUntilChangedSubscriber.prototype._next = function (value) {
      var key;

      try {
        var keySelector = this.keySelector;
        key = keySelector ? keySelector(value) : value;
      } catch (err) {
        return this.destination.error(err);
      }

      var result = false;

      if (this.hasKey) {
        try {
          var compare = this.compare;
          result = compare(this.key, key);
        } catch (err) {
          return this.destination.error(err);
        }
      } else {
        this.hasKey = true;
      }

      if (!result) {
        this.key = key;
        this.destination.next(value);
      }
    };

    return DistinctUntilChangedSubscriber;
  }(Subscriber);

  // shim for using process in browser
  // based off https://github.com/defunctzombie/node-process/blob/master/browser.js
  function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
  }

  function defaultClearTimeout() {
    throw new Error('clearTimeout has not been defined');
  }

  var cachedSetTimeout = defaultSetTimout;
  var cachedClearTimeout = defaultClearTimeout;

  if (typeof global$1.setTimeout === 'function') {
    cachedSetTimeout = setTimeout;
  }

  if (typeof global$1.clearTimeout === 'function') {
    cachedClearTimeout = clearTimeout;
  }

  function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
      //normal enviroments in sane situations
      return setTimeout(fun, 0);
    } // if setTimeout wasn't available but was latter defined


    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
      cachedSetTimeout = setTimeout;
      return setTimeout(fun, 0);
    }

    try {
      // when when somebody has screwed with setTimeout but no I.E. maddness
      return cachedSetTimeout(fun, 0);
    } catch (e) {
      try {
        // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
        return cachedSetTimeout.call(null, fun, 0);
      } catch (e) {
        // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
        return cachedSetTimeout.call(this, fun, 0);
      }
    }
  }

  function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
      //normal enviroments in sane situations
      return clearTimeout(marker);
    } // if clearTimeout wasn't available but was latter defined


    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
      cachedClearTimeout = clearTimeout;
      return clearTimeout(marker);
    }

    try {
      // when when somebody has screwed with setTimeout but no I.E. maddness
      return cachedClearTimeout(marker);
    } catch (e) {
      try {
        // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
        return cachedClearTimeout.call(null, marker);
      } catch (e) {
        // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
        // Some versions of I.E. have different rules for clearTimeout vs setTimeout
        return cachedClearTimeout.call(this, marker);
      }
    }
  }

  var queue = [];
  var draining = false;
  var currentQueue;
  var queueIndex = -1;

  function cleanUpNextTick() {
    if (!draining || !currentQueue) {
      return;
    }

    draining = false;

    if (currentQueue.length) {
      queue = currentQueue.concat(queue);
    } else {
      queueIndex = -1;
    }

    if (queue.length) {
      drainQueue();
    }
  }

  function drainQueue() {
    if (draining) {
      return;
    }

    var timeout = runTimeout(cleanUpNextTick);
    draining = true;
    var len = queue.length;

    while (len) {
      currentQueue = queue;
      queue = [];

      while (++queueIndex < len) {
        if (currentQueue) {
          currentQueue[queueIndex].run();
        }
      }

      queueIndex = -1;
      len = queue.length;
    }

    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
  }

  function nextTick(fun) {
    var args = new Array(arguments.length - 1);

    if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }
    }

    queue.push(new Item(fun, args));

    if (queue.length === 1 && !draining) {
      runTimeout(drainQueue);
    }
  } // v8 likes predictible objects

  function Item(fun, array) {
    this.fun = fun;
    this.array = array;
  }

  Item.prototype.run = function () {
    this.fun.apply(null, this.array);
  };

  var title = 'browser';
  var platform = 'browser';
  var browser = true;
  var env = {};
  var argv = [];
  var version = ''; // empty string to avoid regexp issues

  var versions = {};
  var release = {};
  var config$1 = {};

  function noop$1() {}

  var on = noop$1;
  var addListener = noop$1;
  var once = noop$1;
  var off = noop$1;
  var removeListener = noop$1;
  var removeAllListeners = noop$1;
  var emit = noop$1;
  function binding(name) {
    throw new Error('process.binding is not supported');
  }
  function cwd() {
    return '/';
  }
  function chdir(dir) {
    throw new Error('process.chdir is not supported');
  }
  function umask() {
    return 0;
  } // from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js

  var performance = global$1.performance || {};

  var performanceNow = performance.now || performance.mozNow || performance.msNow || performance.oNow || performance.webkitNow || function () {
    return new Date().getTime();
  }; // generate timestamp or delta
  // see http://nodejs.org/api/process.html#process_process_hrtime


  function hrtime(previousTimestamp) {
    var clocktime = performanceNow.call(performance) * 1e-3;
    var seconds = Math.floor(clocktime);
    var nanoseconds = Math.floor(clocktime % 1 * 1e9);

    if (previousTimestamp) {
      seconds = seconds - previousTimestamp[0];
      nanoseconds = nanoseconds - previousTimestamp[1];

      if (nanoseconds < 0) {
        seconds--;
        nanoseconds += 1e9;
      }
    }

    return [seconds, nanoseconds];
  }
  var startTime = new Date();
  function uptime() {
    var currentTime = new Date();
    var dif = currentTime - startTime;
    return dif / 1000;
  }
  var process = {
    nextTick: nextTick,
    title: title,
    browser: browser,
    env: env,
    argv: argv,
    version: version,
    versions: versions,
    on: on,
    addListener: addListener,
    once: once,
    off: off,
    removeListener: removeListener,
    removeAllListeners: removeAllListeners,
    emit: emit,
    binding: binding,
    cwd: cwd,
    chdir: chdir,
    umask: umask,
    hrtime: hrtime,
    platform: platform,
    release: release,
    config: config$1,
    uptime: uptime
  };

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var sha3 = createCommonjsModule(function (module) {
  /**
   * [js-sha3]{@link https://github.com/emn178/js-sha3}
   *
   * @version 0.8.0
   * @author Chen, Yi-Cyuan [emn178@gmail.com]
   * @copyright Chen, Yi-Cyuan 2015-2018
   * @license MIT
   */

  /*jslint bitwise: true */
  (function () {

    var INPUT_ERROR = 'input is invalid type';
    var FINALIZE_ERROR = 'finalize already called';
    var WINDOW = typeof window === 'object';
    var root = WINDOW ? window : {};

    if (root.JS_SHA3_NO_WINDOW) {
      WINDOW = false;
    }

    var WEB_WORKER = !WINDOW && typeof self === 'object';
    var NODE_JS = !root.JS_SHA3_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;

    if (NODE_JS) {
      root = commonjsGlobal;
    } else if (WEB_WORKER) {
      root = self;
    }

    var COMMON_JS = !root.JS_SHA3_NO_COMMON_JS && 'object' === 'object' && module.exports;
    var ARRAY_BUFFER = !root.JS_SHA3_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
    var HEX_CHARS = '0123456789abcdef'.split('');
    var SHAKE_PADDING = [31, 7936, 2031616, 520093696];
    var CSHAKE_PADDING = [4, 1024, 262144, 67108864];
    var KECCAK_PADDING = [1, 256, 65536, 16777216];
    var PADDING = [6, 1536, 393216, 100663296];
    var SHIFT = [0, 8, 16, 24];
    var RC = [1, 0, 32898, 0, 32906, 2147483648, 2147516416, 2147483648, 32907, 0, 2147483649, 0, 2147516545, 2147483648, 32777, 2147483648, 138, 0, 136, 0, 2147516425, 0, 2147483658, 0, 2147516555, 0, 139, 2147483648, 32905, 2147483648, 32771, 2147483648, 32770, 2147483648, 128, 2147483648, 32778, 0, 2147483658, 2147483648, 2147516545, 2147483648, 32896, 2147483648, 2147483649, 0, 2147516424, 2147483648];
    var BITS = [224, 256, 384, 512];
    var SHAKE_BITS = [128, 256];
    var OUTPUT_TYPES = ['hex', 'buffer', 'arrayBuffer', 'array', 'digest'];
    var CSHAKE_BYTEPAD = {
      '128': 168,
      '256': 136
    };

    if (root.JS_SHA3_NO_NODE_JS || !Array.isArray) {
      Array.isArray = function (obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
      };
    }

    if (ARRAY_BUFFER && (root.JS_SHA3_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
      ArrayBuffer.isView = function (obj) {
        return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer;
      };
    }

    var createOutputMethod = function (bits, padding, outputType) {
      return function (message) {
        return new Keccak(bits, padding, bits).update(message)[outputType]();
      };
    };

    var createShakeOutputMethod = function (bits, padding, outputType) {
      return function (message, outputBits) {
        return new Keccak(bits, padding, outputBits).update(message)[outputType]();
      };
    };

    var createCshakeOutputMethod = function (bits, padding, outputType) {
      return function (message, outputBits, n, s) {
        return methods['cshake' + bits].update(message, outputBits, n, s)[outputType]();
      };
    };

    var createKmacOutputMethod = function (bits, padding, outputType) {
      return function (key, message, outputBits, s) {
        return methods['kmac' + bits].update(key, message, outputBits, s)[outputType]();
      };
    };

    var createOutputMethods = function (method, createMethod, bits, padding) {
      for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
        var type = OUTPUT_TYPES[i];
        method[type] = createMethod(bits, padding, type);
      }

      return method;
    };

    var createMethod = function (bits, padding) {
      var method = createOutputMethod(bits, padding, 'hex');

      method.create = function () {
        return new Keccak(bits, padding, bits);
      };

      method.update = function (message) {
        return method.create().update(message);
      };

      return createOutputMethods(method, createOutputMethod, bits, padding);
    };

    var createShakeMethod = function (bits, padding) {
      var method = createShakeOutputMethod(bits, padding, 'hex');

      method.create = function (outputBits) {
        return new Keccak(bits, padding, outputBits);
      };

      method.update = function (message, outputBits) {
        return method.create(outputBits).update(message);
      };

      return createOutputMethods(method, createShakeOutputMethod, bits, padding);
    };

    var createCshakeMethod = function (bits, padding) {
      var w = CSHAKE_BYTEPAD[bits];
      var method = createCshakeOutputMethod(bits, padding, 'hex');

      method.create = function (outputBits, n, s) {
        if (!n && !s) {
          return methods['shake' + bits].create(outputBits);
        } else {
          return new Keccak(bits, padding, outputBits).bytepad([n, s], w);
        }
      };

      method.update = function (message, outputBits, n, s) {
        return method.create(outputBits, n, s).update(message);
      };

      return createOutputMethods(method, createCshakeOutputMethod, bits, padding);
    };

    var createKmacMethod = function (bits, padding) {
      var w = CSHAKE_BYTEPAD[bits];
      var method = createKmacOutputMethod(bits, padding, 'hex');

      method.create = function (key, outputBits, s) {
        return new Kmac(bits, padding, outputBits).bytepad(['KMAC', s], w).bytepad([key], w);
      };

      method.update = function (key, message, outputBits, s) {
        return method.create(key, outputBits, s).update(message);
      };

      return createOutputMethods(method, createKmacOutputMethod, bits, padding);
    };

    var algorithms = [{
      name: 'keccak',
      padding: KECCAK_PADDING,
      bits: BITS,
      createMethod: createMethod
    }, {
      name: 'sha3',
      padding: PADDING,
      bits: BITS,
      createMethod: createMethod
    }, {
      name: 'shake',
      padding: SHAKE_PADDING,
      bits: SHAKE_BITS,
      createMethod: createShakeMethod
    }, {
      name: 'cshake',
      padding: CSHAKE_PADDING,
      bits: SHAKE_BITS,
      createMethod: createCshakeMethod
    }, {
      name: 'kmac',
      padding: CSHAKE_PADDING,
      bits: SHAKE_BITS,
      createMethod: createKmacMethod
    }];
    var methods = {},
        methodNames = [];

    for (var i = 0; i < algorithms.length; ++i) {
      var algorithm = algorithms[i];
      var bits = algorithm.bits;

      for (var j = 0; j < bits.length; ++j) {
        var methodName = algorithm.name + '_' + bits[j];
        methodNames.push(methodName);
        methods[methodName] = algorithm.createMethod(bits[j], algorithm.padding);

        if (algorithm.name !== 'sha3') {
          var newMethodName = algorithm.name + bits[j];
          methodNames.push(newMethodName);
          methods[newMethodName] = methods[methodName];
        }
      }
    }

    function Keccak(bits, padding, outputBits) {
      this.blocks = [];
      this.s = [];
      this.padding = padding;
      this.outputBits = outputBits;
      this.reset = true;
      this.finalized = false;
      this.block = 0;
      this.start = 0;
      this.blockCount = 1600 - (bits << 1) >> 5;
      this.byteCount = this.blockCount << 2;
      this.outputBlocks = outputBits >> 5;
      this.extraBytes = (outputBits & 31) >> 3;

      for (var i = 0; i < 50; ++i) {
        this.s[i] = 0;
      }
    }

    Keccak.prototype.update = function (message) {
      if (this.finalized) {
        throw new Error(FINALIZE_ERROR);
      }

      var notString,
          type = typeof message;

      if (type !== 'string') {
        if (type === 'object') {
          if (message === null) {
            throw new Error(INPUT_ERROR);
          } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
            message = new Uint8Array(message);
          } else if (!Array.isArray(message)) {
            if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
              throw new Error(INPUT_ERROR);
            }
          }
        } else {
          throw new Error(INPUT_ERROR);
        }

        notString = true;
      }

      var blocks = this.blocks,
          byteCount = this.byteCount,
          length = message.length,
          blockCount = this.blockCount,
          index = 0,
          s = this.s,
          i,
          code;

      while (index < length) {
        if (this.reset) {
          this.reset = false;
          blocks[0] = this.block;

          for (i = 1; i < blockCount + 1; ++i) {
            blocks[i] = 0;
          }
        }

        if (notString) {
          for (i = this.start; index < length && i < byteCount; ++index) {
            blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
          }
        } else {
          for (i = this.start; index < length && i < byteCount; ++index) {
            code = message.charCodeAt(index);

            if (code < 0x80) {
              blocks[i >> 2] |= code << SHIFT[i++ & 3];
            } else if (code < 0x800) {
              blocks[i >> 2] |= (0xc0 | code >> 6) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | code & 0x3f) << SHIFT[i++ & 3];
            } else if (code < 0xd800 || code >= 0xe000) {
              blocks[i >> 2] |= (0xe0 | code >> 12) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | code >> 6 & 0x3f) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | code & 0x3f) << SHIFT[i++ & 3];
            } else {
              code = 0x10000 + ((code & 0x3ff) << 10 | message.charCodeAt(++index) & 0x3ff);
              blocks[i >> 2] |= (0xf0 | code >> 18) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | code >> 12 & 0x3f) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | code >> 6 & 0x3f) << SHIFT[i++ & 3];
              blocks[i >> 2] |= (0x80 | code & 0x3f) << SHIFT[i++ & 3];
            }
          }
        }

        this.lastByteIndex = i;

        if (i >= byteCount) {
          this.start = i - byteCount;
          this.block = blocks[blockCount];

          for (i = 0; i < blockCount; ++i) {
            s[i] ^= blocks[i];
          }

          f(s);
          this.reset = true;
        } else {
          this.start = i;
        }
      }

      return this;
    };

    Keccak.prototype.encode = function (x, right) {
      var o = x & 255,
          n = 1;
      var bytes = [o];
      x = x >> 8;
      o = x & 255;

      while (o > 0) {
        bytes.unshift(o);
        x = x >> 8;
        o = x & 255;
        ++n;
      }

      if (right) {
        bytes.push(n);
      } else {
        bytes.unshift(n);
      }

      this.update(bytes);
      return bytes.length;
    };

    Keccak.prototype.encodeString = function (str) {
      var notString,
          type = typeof str;

      if (type !== 'string') {
        if (type === 'object') {
          if (str === null) {
            throw new Error(INPUT_ERROR);
          } else if (ARRAY_BUFFER && str.constructor === ArrayBuffer) {
            str = new Uint8Array(str);
          } else if (!Array.isArray(str)) {
            if (!ARRAY_BUFFER || !ArrayBuffer.isView(str)) {
              throw new Error(INPUT_ERROR);
            }
          }
        } else {
          throw new Error(INPUT_ERROR);
        }

        notString = true;
      }

      var bytes = 0,
          length = str.length;

      if (notString) {
        bytes = length;
      } else {
        for (var i = 0; i < str.length; ++i) {
          var code = str.charCodeAt(i);

          if (code < 0x80) {
            bytes += 1;
          } else if (code < 0x800) {
            bytes += 2;
          } else if (code < 0xd800 || code >= 0xe000) {
            bytes += 3;
          } else {
            code = 0x10000 + ((code & 0x3ff) << 10 | str.charCodeAt(++i) & 0x3ff);
            bytes += 4;
          }
        }
      }

      bytes += this.encode(bytes * 8);
      this.update(str);
      return bytes;
    };

    Keccak.prototype.bytepad = function (strs, w) {
      var bytes = this.encode(w);

      for (var i = 0; i < strs.length; ++i) {
        bytes += this.encodeString(strs[i]);
      }

      var paddingBytes = w - bytes % w;
      var zeros = [];
      zeros.length = paddingBytes;
      this.update(zeros);
      return this;
    };

    Keccak.prototype.finalize = function () {
      if (this.finalized) {
        return;
      }

      this.finalized = true;
      var blocks = this.blocks,
          i = this.lastByteIndex,
          blockCount = this.blockCount,
          s = this.s;
      blocks[i >> 2] |= this.padding[i & 3];

      if (this.lastByteIndex === this.byteCount) {
        blocks[0] = blocks[blockCount];

        for (i = 1; i < blockCount + 1; ++i) {
          blocks[i] = 0;
        }
      }

      blocks[blockCount - 1] |= 0x80000000;

      for (i = 0; i < blockCount; ++i) {
        s[i] ^= blocks[i];
      }

      f(s);
    };

    Keccak.prototype.toString = Keccak.prototype.hex = function () {
      this.finalize();
      var blockCount = this.blockCount,
          s = this.s,
          outputBlocks = this.outputBlocks,
          extraBytes = this.extraBytes,
          i = 0,
          j = 0;
      var hex = '',
          block;

      while (j < outputBlocks) {
        for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
          block = s[i];
          hex += HEX_CHARS[block >> 4 & 0x0F] + HEX_CHARS[block & 0x0F] + HEX_CHARS[block >> 12 & 0x0F] + HEX_CHARS[block >> 8 & 0x0F] + HEX_CHARS[block >> 20 & 0x0F] + HEX_CHARS[block >> 16 & 0x0F] + HEX_CHARS[block >> 28 & 0x0F] + HEX_CHARS[block >> 24 & 0x0F];
        }

        if (j % blockCount === 0) {
          f(s);
          i = 0;
        }
      }

      if (extraBytes) {
        block = s[i];
        hex += HEX_CHARS[block >> 4 & 0x0F] + HEX_CHARS[block & 0x0F];

        if (extraBytes > 1) {
          hex += HEX_CHARS[block >> 12 & 0x0F] + HEX_CHARS[block >> 8 & 0x0F];
        }

        if (extraBytes > 2) {
          hex += HEX_CHARS[block >> 20 & 0x0F] + HEX_CHARS[block >> 16 & 0x0F];
        }
      }

      return hex;
    };

    Keccak.prototype.arrayBuffer = function () {
      this.finalize();
      var blockCount = this.blockCount,
          s = this.s,
          outputBlocks = this.outputBlocks,
          extraBytes = this.extraBytes,
          i = 0,
          j = 0;
      var bytes = this.outputBits >> 3;
      var buffer;

      if (extraBytes) {
        buffer = new ArrayBuffer(outputBlocks + 1 << 2);
      } else {
        buffer = new ArrayBuffer(bytes);
      }

      var array = new Uint32Array(buffer);

      while (j < outputBlocks) {
        for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
          array[j] = s[i];
        }

        if (j % blockCount === 0) {
          f(s);
        }
      }

      if (extraBytes) {
        array[i] = s[i];
        buffer = buffer.slice(0, bytes);
      }

      return buffer;
    };

    Keccak.prototype.buffer = Keccak.prototype.arrayBuffer;

    Keccak.prototype.digest = Keccak.prototype.array = function () {
      this.finalize();
      var blockCount = this.blockCount,
          s = this.s,
          outputBlocks = this.outputBlocks,
          extraBytes = this.extraBytes,
          i = 0,
          j = 0;
      var array = [],
          offset,
          block;

      while (j < outputBlocks) {
        for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
          offset = j << 2;
          block = s[i];
          array[offset] = block & 0xFF;
          array[offset + 1] = block >> 8 & 0xFF;
          array[offset + 2] = block >> 16 & 0xFF;
          array[offset + 3] = block >> 24 & 0xFF;
        }

        if (j % blockCount === 0) {
          f(s);
        }
      }

      if (extraBytes) {
        offset = j << 2;
        block = s[i];
        array[offset] = block & 0xFF;

        if (extraBytes > 1) {
          array[offset + 1] = block >> 8 & 0xFF;
        }

        if (extraBytes > 2) {
          array[offset + 2] = block >> 16 & 0xFF;
        }
      }

      return array;
    };

    function Kmac(bits, padding, outputBits) {
      Keccak.call(this, bits, padding, outputBits);
    }

    Kmac.prototype = new Keccak();

    Kmac.prototype.finalize = function () {
      this.encode(this.outputBits, true);
      return Keccak.prototype.finalize.call(this);
    };

    var f = function (s) {
      var h, l, n, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17, b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28, b29, b30, b31, b32, b33, b34, b35, b36, b37, b38, b39, b40, b41, b42, b43, b44, b45, b46, b47, b48, b49;

      for (n = 0; n < 48; n += 2) {
        c0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
        c1 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
        c2 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
        c3 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
        c4 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
        c5 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
        c6 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
        c7 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
        c8 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
        c9 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];
        h = c8 ^ (c2 << 1 | c3 >>> 31);
        l = c9 ^ (c3 << 1 | c2 >>> 31);
        s[0] ^= h;
        s[1] ^= l;
        s[10] ^= h;
        s[11] ^= l;
        s[20] ^= h;
        s[21] ^= l;
        s[30] ^= h;
        s[31] ^= l;
        s[40] ^= h;
        s[41] ^= l;
        h = c0 ^ (c4 << 1 | c5 >>> 31);
        l = c1 ^ (c5 << 1 | c4 >>> 31);
        s[2] ^= h;
        s[3] ^= l;
        s[12] ^= h;
        s[13] ^= l;
        s[22] ^= h;
        s[23] ^= l;
        s[32] ^= h;
        s[33] ^= l;
        s[42] ^= h;
        s[43] ^= l;
        h = c2 ^ (c6 << 1 | c7 >>> 31);
        l = c3 ^ (c7 << 1 | c6 >>> 31);
        s[4] ^= h;
        s[5] ^= l;
        s[14] ^= h;
        s[15] ^= l;
        s[24] ^= h;
        s[25] ^= l;
        s[34] ^= h;
        s[35] ^= l;
        s[44] ^= h;
        s[45] ^= l;
        h = c4 ^ (c8 << 1 | c9 >>> 31);
        l = c5 ^ (c9 << 1 | c8 >>> 31);
        s[6] ^= h;
        s[7] ^= l;
        s[16] ^= h;
        s[17] ^= l;
        s[26] ^= h;
        s[27] ^= l;
        s[36] ^= h;
        s[37] ^= l;
        s[46] ^= h;
        s[47] ^= l;
        h = c6 ^ (c0 << 1 | c1 >>> 31);
        l = c7 ^ (c1 << 1 | c0 >>> 31);
        s[8] ^= h;
        s[9] ^= l;
        s[18] ^= h;
        s[19] ^= l;
        s[28] ^= h;
        s[29] ^= l;
        s[38] ^= h;
        s[39] ^= l;
        s[48] ^= h;
        s[49] ^= l;
        b0 = s[0];
        b1 = s[1];
        b32 = s[11] << 4 | s[10] >>> 28;
        b33 = s[10] << 4 | s[11] >>> 28;
        b14 = s[20] << 3 | s[21] >>> 29;
        b15 = s[21] << 3 | s[20] >>> 29;
        b46 = s[31] << 9 | s[30] >>> 23;
        b47 = s[30] << 9 | s[31] >>> 23;
        b28 = s[40] << 18 | s[41] >>> 14;
        b29 = s[41] << 18 | s[40] >>> 14;
        b20 = s[2] << 1 | s[3] >>> 31;
        b21 = s[3] << 1 | s[2] >>> 31;
        b2 = s[13] << 12 | s[12] >>> 20;
        b3 = s[12] << 12 | s[13] >>> 20;
        b34 = s[22] << 10 | s[23] >>> 22;
        b35 = s[23] << 10 | s[22] >>> 22;
        b16 = s[33] << 13 | s[32] >>> 19;
        b17 = s[32] << 13 | s[33] >>> 19;
        b48 = s[42] << 2 | s[43] >>> 30;
        b49 = s[43] << 2 | s[42] >>> 30;
        b40 = s[5] << 30 | s[4] >>> 2;
        b41 = s[4] << 30 | s[5] >>> 2;
        b22 = s[14] << 6 | s[15] >>> 26;
        b23 = s[15] << 6 | s[14] >>> 26;
        b4 = s[25] << 11 | s[24] >>> 21;
        b5 = s[24] << 11 | s[25] >>> 21;
        b36 = s[34] << 15 | s[35] >>> 17;
        b37 = s[35] << 15 | s[34] >>> 17;
        b18 = s[45] << 29 | s[44] >>> 3;
        b19 = s[44] << 29 | s[45] >>> 3;
        b10 = s[6] << 28 | s[7] >>> 4;
        b11 = s[7] << 28 | s[6] >>> 4;
        b42 = s[17] << 23 | s[16] >>> 9;
        b43 = s[16] << 23 | s[17] >>> 9;
        b24 = s[26] << 25 | s[27] >>> 7;
        b25 = s[27] << 25 | s[26] >>> 7;
        b6 = s[36] << 21 | s[37] >>> 11;
        b7 = s[37] << 21 | s[36] >>> 11;
        b38 = s[47] << 24 | s[46] >>> 8;
        b39 = s[46] << 24 | s[47] >>> 8;
        b30 = s[8] << 27 | s[9] >>> 5;
        b31 = s[9] << 27 | s[8] >>> 5;
        b12 = s[18] << 20 | s[19] >>> 12;
        b13 = s[19] << 20 | s[18] >>> 12;
        b44 = s[29] << 7 | s[28] >>> 25;
        b45 = s[28] << 7 | s[29] >>> 25;
        b26 = s[38] << 8 | s[39] >>> 24;
        b27 = s[39] << 8 | s[38] >>> 24;
        b8 = s[48] << 14 | s[49] >>> 18;
        b9 = s[49] << 14 | s[48] >>> 18;
        s[0] = b0 ^ ~b2 & b4;
        s[1] = b1 ^ ~b3 & b5;
        s[10] = b10 ^ ~b12 & b14;
        s[11] = b11 ^ ~b13 & b15;
        s[20] = b20 ^ ~b22 & b24;
        s[21] = b21 ^ ~b23 & b25;
        s[30] = b30 ^ ~b32 & b34;
        s[31] = b31 ^ ~b33 & b35;
        s[40] = b40 ^ ~b42 & b44;
        s[41] = b41 ^ ~b43 & b45;
        s[2] = b2 ^ ~b4 & b6;
        s[3] = b3 ^ ~b5 & b7;
        s[12] = b12 ^ ~b14 & b16;
        s[13] = b13 ^ ~b15 & b17;
        s[22] = b22 ^ ~b24 & b26;
        s[23] = b23 ^ ~b25 & b27;
        s[32] = b32 ^ ~b34 & b36;
        s[33] = b33 ^ ~b35 & b37;
        s[42] = b42 ^ ~b44 & b46;
        s[43] = b43 ^ ~b45 & b47;
        s[4] = b4 ^ ~b6 & b8;
        s[5] = b5 ^ ~b7 & b9;
        s[14] = b14 ^ ~b16 & b18;
        s[15] = b15 ^ ~b17 & b19;
        s[24] = b24 ^ ~b26 & b28;
        s[25] = b25 ^ ~b27 & b29;
        s[34] = b34 ^ ~b36 & b38;
        s[35] = b35 ^ ~b37 & b39;
        s[44] = b44 ^ ~b46 & b48;
        s[45] = b45 ^ ~b47 & b49;
        s[6] = b6 ^ ~b8 & b0;
        s[7] = b7 ^ ~b9 & b1;
        s[16] = b16 ^ ~b18 & b10;
        s[17] = b17 ^ ~b19 & b11;
        s[26] = b26 ^ ~b28 & b20;
        s[27] = b27 ^ ~b29 & b21;
        s[36] = b36 ^ ~b38 & b30;
        s[37] = b37 ^ ~b39 & b31;
        s[46] = b46 ^ ~b48 & b40;
        s[47] = b47 ^ ~b49 & b41;
        s[8] = b8 ^ ~b0 & b2;
        s[9] = b9 ^ ~b1 & b3;
        s[18] = b18 ^ ~b10 & b12;
        s[19] = b19 ^ ~b11 & b13;
        s[28] = b28 ^ ~b20 & b22;
        s[29] = b29 ^ ~b21 & b23;
        s[38] = b38 ^ ~b30 & b32;
        s[39] = b39 ^ ~b31 & b33;
        s[48] = b48 ^ ~b40 & b42;
        s[49] = b49 ^ ~b41 & b43;
        s[0] ^= RC[n];
        s[1] ^= RC[n + 1];
      }
    };

    if (COMMON_JS) {
      module.exports = methods;
    } else {
      for (i = 0; i < methodNames.length; ++i) {
        root[methodNames[i]] = methods[methodNames[i]];
      }
    }
  })();
  });

  var hash = function hash(value) {
    return sha3.keccak256.array(value);
  };

  var FEED_TOPIC_LENGTH = 32;
  var FEED_USER_LENGTH = 20;
  var FEED_TIME_LENGTH = 7;
  var FEED_LEVEL_LENGTH = 1;
  var FEED_HEADER_LENGTH = 8;
  var bytesToHexValue = function bytesToHexValue(bytes) {
    return hexValueType('0x' + Buffer.from(bytes).toString('hex'));
  };
  var createFeedDigest = function createFeedDigest(meta, data) {
    var topicBuffer = createHex(meta.feed.topic).toBuffer();

    if (topicBuffer.length !== FEED_TOPIC_LENGTH) {
      throw new Error('Invalid topic length');
    }

    var userBuffer = createHex(meta.feed.user).toBuffer();

    if (userBuffer.length !== FEED_USER_LENGTH) {
      throw new Error('Invalid user length');
    }

    var headerBuffer = Buffer.alloc(FEED_HEADER_LENGTH, 0);
    headerBuffer.writeInt8(meta.protocolVersion, 0);
    var timeBuffer = Buffer.alloc(FEED_TIME_LENGTH, 0);
    timeBuffer.writeUInt32LE(meta.epoch.time, 0);
    var levelBuffer = Buffer.alloc(FEED_LEVEL_LENGTH, 0);
    levelBuffer.writeUInt8(meta.epoch.level, 0);
    var payload = Buffer.concat([headerBuffer, topicBuffer, userBuffer, timeBuffer, levelBuffer, createHex(data).toBuffer()]);
    return hash(payload);
  };
  var getFeedTopic = function getFeedTopic(params) {
    var topicHex = createHex(params.topic || Buffer.alloc(FEED_TOPIC_LENGTH));

    if (params.name == null) {
      return topicHex.value;
    }

    var name = Buffer.from(params.name);
    var topic = topicHex.toBuffer();
    var bytes = Array(FEED_TOPIC_LENGTH).fill().map(function (_, i) {
      return topic[i] ^ name[i];
    });
    return bytesToHexValue(bytes);
  };

  var BZZ_MODE_PROTOCOLS = {
    default: 'bzz:/',
    feed: 'bzz-feed:/',
    immutable: 'bzz-immutable:/',
    raw: 'bzz-raw:/'
  };
  var getModeProtocol = function getModeProtocol(mode) {
    return mode && BZZ_MODE_PROTOCOLS[mode] || BZZ_MODE_PROTOCOLS.default;
  };
  var HTTPError =
  /*#__PURE__*/
  function (_Error) {
    _inheritsLoose(HTTPError, _Error);

    function HTTPError(status, message) {
      var _this;

      _this = _Error.call(this, message) || this;

      _defineProperty(_assertThisInitialized(_this), "status", void 0);

      _this.status = status;
      return _this;
    }

    return HTTPError;
  }(_wrapNativeSuper(Error));
  var resOrError = function resOrError(res) {
    return res.ok ? Promise.resolve(res) : Promise.reject(new HTTPError(res.status, res.statusText));
  };
  var resJSON = function resJSON(res) {
    return resOrError(res).then(function (r) {
      return r.json();
    });
  };
  var resText = function resText(res) {
    return resOrError(res).then(function (r) {
      return r.text();
    });
  };
  var resSwarmHash = function resSwarmHash(res) {
    return resOrError(res).then(function (r) {
      return r.arrayBuffer();
    }).then(function (value) {
      return Buffer.from(new Uint8Array(value)).toString('hex');
    });
  };

  var defaultSignBytes = function defaultSignBytes() {
    return Promise.reject(new Error('Missing `signBytes()` function'));
  };

  var BaseBzz =
  /*#__PURE__*/
  function () {
    function BaseBzz(config) {
      _defineProperty(this, "_defaultTimeout", void 0);

      _defineProperty(this, "_fetch", void 0);

      _defineProperty(this, "_signBytes", void 0);

      _defineProperty(this, "_url", void 0);

      var url = config.url,
          timeout = config.timeout;
      this._defaultTimeout = timeout ? timeout : 0;
      this._signBytes = config.signBytes || defaultSignBytes;
      this._url = url;
    }

    var _proto = BaseBzz.prototype;

    _proto._fetchTimeout = function _fetchTimeout(url, options, params) {
      var _this2 = this;

      if (params === void 0) {
        params = {};
      }

      var timeout = options.timeout == null ? this._defaultTimeout : options.timeout;

      if (options.headers != null) {
        params.headers = options.headers;
      }

      if (timeout === 0) {
        // No timeout
        return this._fetch(url, params);
      }

      return new Promise(function (resolve, reject) {
        var timeoutID = setTimeout(function () {
          reject(new Error('Timeout'));
        }, timeout);

        _this2._fetch(url, params).then(function (res) {
          clearTimeout(timeoutID);
          resolve(res);
        });
      });
    };

    _proto.sign = function sign(bytes, params) {
      return this._signBytes(bytes, params).then(bytesToHexValue);
    };

    _proto.getDownloadURL = function getDownloadURL(hash, options, raw) {
      if (options === void 0) {
        options = {};
      }

      if (raw === void 0) {
        raw = false;
      }

      var protocol = raw ? BZZ_MODE_PROTOCOLS.raw : getModeProtocol(options.mode);
      var url = "" + this._url + protocol + hash + "/";

      if (options.path != null) {
        url += options.path;
      }

      if (options.mode === 'raw' && options.contentType != null) {
        url += "?content_type=" + options.contentType;
      }

      return url;
    };

    _proto.getUploadURL = function getUploadURL(options, raw) {
      if (options === void 0) {
        options = {};
      }

      if (raw === void 0) {
        raw = false;
      } // Default URL to creation


      var url = this._url + BZZ_MODE_PROTOCOLS[raw ? 'raw' : 'default']; // Manifest update if hash is provided

      if (options.manifestHash != null) {
        url += options.manifestHash + "/";

        if (options.path != null) {
          url += options.path;
        }
      }

      if (options.defaultPath != null) {
        url += "?defaultpath=" + options.defaultPath;
      }

      return url;
    };

    _proto.getFeedURL = function getFeedURL(hashOrParams, flag) {
      var url = this._url + BZZ_MODE_PROTOCOLS.feed;
      var query = [];

      if (typeof hashOrParams === 'string') {
        // feed hash
        url += hashOrParams + "/";
      } else {
        // feed params
        query = Object.keys(hashOrParams).reduce(function (acc, key) {
          // $FlowFixMe: hashOrParams type
          var value = hashOrParams[key];

          if (value != null) {
            acc.push(key + "=" + value);
          }

          return acc;
        }, []);
      }

      if (flag != null) {
        query.push(flag + "=1");
      }

      return query.length > 0 ? url + "?" + query.join('&') : url;
    };

    _proto.hash = function hash(domain, options) {
      if (options === void 0) {
        options = {};
      }

      return this._fetchTimeout(this._url + "bzz-hash:/" + domain, options).then(resText);
    };

    _proto.list = function list(hash, options) {
      if (options === void 0) {
        options = {};
      }

      var url = this._url + "bzz-list:/" + hash + "/";

      if (options.path != null) {
        url += options.path;
      }

      return this._fetchTimeout(url, options).then(resJSON);
    };

    _proto._download = function _download(hash, options) {
      var url = this.getDownloadURL(hash, options);
      return this._fetchTimeout(url, options).then(resOrError);
    };

    _proto.download = function download(hash, options) {
      if (options === void 0) {
        options = {};
      }

      return this._download(hash, options);
    };

    _proto._upload = function _upload(body, options, raw) {
      if (raw === void 0) {
        raw = false;
      }

      var url = this.getUploadURL(options, raw);
      return this._fetchTimeout(url, options, {
        body: body,
        method: 'POST'
      }).then(resText).then(hexValueType);
    };

    _proto.uploadFile = function uploadFile(data, options) {
      if (options === void 0) {
        options = {};
      }

      var body = typeof data === 'string' ? Buffer.from(data) : data;
      var raw = options.contentType == null;

      if (options.headers == null) {
        options.headers = {};
      }

      options.headers['content-length'] = body.length;

      if (options.headers != null && options.headers['content-type'] == null && !raw) {
        options.headers['content-type'] = options.contentType;
      }

      return this._upload(body, options, raw);
    };

    _proto.uploadDirectory = function uploadDirectory(_directory, _options) {
      return Promise.reject(new Error('Must be implemented in extending class'));
    };

    _proto.upload = function upload(data, options) {
      if (options === void 0) {
        options = {};
      }

      return typeof data === 'string' || isBuffer(data) ? // $FlowFixMe: Flow doesn't understand type refinement with Buffer check
      this.uploadFile(data, options) : this.uploadDirectory(data, options);
    };

    _proto.deleteResource = function deleteResource(hash, path, options) {
      if (options === void 0) {
        options = {};
      }

      var url = this.getUploadURL({
        manifestHash: hash,
        path: path
      });
      return this._fetchTimeout(url, options, {
        method: 'DELETE'
      }).then(resText);
    };

    _proto.createFeedManifest = function createFeedManifest(params, options) {
      if (options === void 0) {
        options = {};
      }

      var manifest = {
        entries: [{
          contentType: 'application/bzz-feed',
          mod_time: '0001-01-01T00:00:00Z',
          feed: {
            topic: getFeedTopic(params),
            user: params.user
          }
        }]
      };
      return this.uploadFile(JSON.stringify(manifest), options).then(hexValueType);
    };

    _proto.getFeedMetadata = function getFeedMetadata(hashOrParams, options) {
      if (options === void 0) {
        options = {};
      }

      var url = this.getFeedURL(hashOrParams, 'meta');
      return this._fetchTimeout(url, options).then(resJSON);
    };

    _proto.getFeedChunk = function getFeedChunk(hashOrParams, options) {
      if (options === void 0) {
        options = {};
      }

      var url = this.getFeedURL(hashOrParams);
      return this._fetchTimeout(url, options).then(resOrError);
    };

    _proto.getFeedContentHash = function getFeedContentHash(hashOrParams, options) {
      if (options === void 0) {
        options = {};
      }

      return this.getFeedChunk(hashOrParams, options).then(resSwarmHash);
    };

    _proto.getFeedContent = function getFeedContent(hashOrParams, options) {
      var _this3 = this;

      if (options === void 0) {
        options = {};
      }

      return this.getFeedContentHash(hashOrParams, {
        headers: options.headers,
        timeout: options.timeout
      }).then(function (hash) {
        return _this3.download(hash, options);
      });
    };

    _proto.pollFeedChunk = function pollFeedChunk(hashOrParams, options) {
      var _this4 = this,
          _merge;

      var sources = []; // Trigger the flow immediately by default

      if (options.immediate !== false) {
        sources.push([0]);
      } // An external trigger can be provided in the options so the consumer can execute the flow when needed


      if (options.trigger != null) {
        sources.push(options.trigger);
      }

      var pipeline = []; // Handle whether the subscription should fail if the feed doesn't have a value

      if (options.whenEmpty === 'error') {
        pipeline.push(mergeMap(function () {
          return _this4.getFeedChunk(hashOrParams, options);
        }));
      } else {
        var url = this.getFeedURL(hashOrParams);
        pipeline.push(mergeMap(function () {
          return _this4._fetchTimeout(url, options).then(function (res) {
            if (res.status === 404) {
              return null;
            }

            if (res.ok) {
              return res;
            }

            return new HTTPError(res.status, res.statusText);
          });
        })); // Default behavior will emit null values, only omit them when option is set

        if (options.whenEmpty === 'ignore') {
          pipeline.push(filter(function (res) {
            return res !== null;
          }));
        }
      }

      return (_merge = merge.apply(void 0, [interval(options.interval)].concat(sources))).pipe.apply(_merge, pipeline);
    };

    _proto.pollFeedContentHash = function pollFeedContentHash(hashOrParams, options) {
      var _this$pollFeedChunk;

      var pipeline = [mergeMap(function (res) {
        return res === null ? Promise.resolve(null) : resSwarmHash(res);
      })];

      if (options.changedOnly) {
        pipeline.push(distinctUntilChanged());
      }

      return (_this$pollFeedChunk = this.pollFeedChunk(hashOrParams, options)).pipe.apply(_this$pollFeedChunk, pipeline);
    };

    _proto.pollFeedContent = function pollFeedContent(hashOrParams, options) {
      var _this5 = this;

      return this.pollFeedContentHash(hashOrParams, options).pipe(mergeMap(function (hash) {
        return hash === null ? Promise.resolve(null) : _this5.download(hash, options);
      }));
    };

    _proto.postSignedFeedChunk = function postSignedFeedChunk(params, body, options) {
      if (options === void 0) {
        options = {};
      }

      var url = this.getFeedURL(params);
      return this._fetchTimeout(url, options, {
        method: 'POST',
        body: body
      }).then(resOrError);
    };

    _proto.postFeedChunk = function postFeedChunk(meta, data, options, signParams) {
      var _this6 = this;

      var body = createHex(data).toBuffer();
      var digest = createFeedDigest(meta, body);
      return this.sign(digest, signParams).then(function (signature) {
        var params = {
          user: meta.feed.user,
          topic: meta.feed.topic,
          time: meta.epoch.time,
          level: meta.epoch.level,
          signature: signature
        };
        return _this6.postSignedFeedChunk(params, body, options);
      });
    };

    _proto.setFeedChunk = function setFeedChunk(hashOrParams, data, options, signParams) {
      var _this7 = this;

      return this.getFeedMetadata(hashOrParams, options).then(function (meta) {
        return _this7.postFeedChunk(meta, data, options, signParams);
      });
    };

    _proto.setFeedContentHash = function setFeedContentHash(hashOrParams, contentHash, options, signParams) {
      var _this8 = this;

      return this.getFeedMetadata(hashOrParams, options).then(function (meta) {
        return _this8.postFeedChunk(meta, "0x" + contentHash, options, signParams);
      });
    };

    _proto.setFeedContent = function setFeedContent(hashOrParams, data, options, signParams) {
      var _this9 = this;

      if (options === void 0) {
        options = {};
      }

      var _options2 = options,
          _c = _options2.contentType,
          feedOptions = _objectWithoutPropertiesLoose(_options2, ["contentType"]);

      return Promise.all([this.upload(data, options), this.getFeedMetadata(hashOrParams, feedOptions)]).then(function (_ref) {
        var hash = _ref[0],
            meta = _ref[1];
        return _this9.postFeedChunk(meta, "0x" + hash, feedOptions, signParams).then(function () {
          return hash;
        });
      });
    };

    return BaseBzz;
  }();

  var Bzz =
  /*#__PURE__*/
  function (_BaseBzz) {
    _inheritsLoose(Bzz, _BaseBzz);

    function Bzz(config) {
      var _this;

      var url = config.url,
          cfg = _objectWithoutPropertiesLoose(config, ["url"]);

      _this = _BaseBzz.call(this, _extends({}, cfg, {
        url: new URL(url).href
      })) || this;
      _this._fetch = window.fetch.bind(window);
      return _this;
    }

    var _proto = Bzz.prototype;

    _proto.uploadDirectory = function uploadDirectory(directory, options) {
      if (options === void 0) {
        options = {};
      }

      var form = new FormData();
      Object.keys(directory).forEach(function (key) {
        form.append(key, new Blob([directory[key].data], {
          type: directory[key].contentType
        }), key);
      });

      if (options.defaultPath != null) {
        var file = directory[options.defaultPath];

        if (file != null) {
          form.append('', new Blob([file.data], {
            type: file.contentType
          }), '');
        }
      }

      return this._upload(form, options);
    };

    return Bzz;
  }(BaseBzz);

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function isFunction$1(x) {
    return typeof x === 'function';
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var _enable_super_gross_mode_that_will_cause_bad_things$1 = false;
  var config$2 = {
    Promise: undefined,

    set useDeprecatedSynchronousErrorHandling(value) {
      if (value) {
        var error =
        /*@__PURE__*/
        new Error();
        /*@__PURE__*/

        console.warn('DEPRECATED! RxJS was set to use deprecated synchronous error handling behavior by code at: \n' + error.stack);
      }

      _enable_super_gross_mode_that_will_cause_bad_things$1 = value;
    },

    get useDeprecatedSynchronousErrorHandling() {
      return _enable_super_gross_mode_that_will_cause_bad_things$1;
    }

  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function hostReportError$1(err) {
    setTimeout(function () {
      throw err;
    }, 0);
  }

  /** PURE_IMPORTS_START _config,_util_hostReportError PURE_IMPORTS_END */
  var empty$1 = {
    closed: true,
    next: function (value) {},
    error: function (err) {
      if (config$2.useDeprecatedSynchronousErrorHandling) {
        throw err;
      } else {
        hostReportError$1(err);
      }
    },
    complete: function () {}
  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var isArray$2 = Array.isArray || function (x) {
    return x && typeof x.length === 'number';
  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function isObject$1(x) {
    return x !== null && typeof x === 'object';
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function UnsubscriptionErrorImpl$1(errors) {
    Error.call(this);
    this.message = errors ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) {
      return i + 1 + ") " + err.toString();
    }).join('\n  ') : '';
    this.name = 'UnsubscriptionError';
    this.errors = errors;
    return this;
  }

  UnsubscriptionErrorImpl$1.prototype =
  /*@__PURE__*/
  Object.create(Error.prototype);
  var UnsubscriptionError$1 = UnsubscriptionErrorImpl$1;

  /** PURE_IMPORTS_START _util_isArray,_util_isObject,_util_isFunction,_util_UnsubscriptionError PURE_IMPORTS_END */

  var Subscription$1 =
  /*@__PURE__*/
  function () {
    function Subscription(unsubscribe) {
      this.closed = false;
      this._parentOrParents = null;
      this._subscriptions = null;

      if (unsubscribe) {
        this._unsubscribe = unsubscribe;
      }
    }

    Subscription.prototype.unsubscribe = function () {
      var errors;

      if (this.closed) {
        return;
      }

      var _a = this,
          _parentOrParents = _a._parentOrParents,
          _unsubscribe = _a._unsubscribe,
          _subscriptions = _a._subscriptions;

      this.closed = true;
      this._parentOrParents = null;
      this._subscriptions = null;

      if (_parentOrParents instanceof Subscription) {
        _parentOrParents.remove(this);
      } else if (_parentOrParents !== null) {
        for (var index = 0; index < _parentOrParents.length; ++index) {
          var parent_1 = _parentOrParents[index];
          parent_1.remove(this);
        }
      }

      if (isFunction$1(_unsubscribe)) {
        try {
          _unsubscribe.call(this);
        } catch (e) {
          errors = e instanceof UnsubscriptionError$1 ? flattenUnsubscriptionErrors$1(e.errors) : [e];
        }
      }

      if (isArray$2(_subscriptions)) {
        var index = -1;
        var len = _subscriptions.length;

        while (++index < len) {
          var sub = _subscriptions[index];

          if (isObject$1(sub)) {
            try {
              sub.unsubscribe();
            } catch (e) {
              errors = errors || [];

              if (e instanceof UnsubscriptionError$1) {
                errors = errors.concat(flattenUnsubscriptionErrors$1(e.errors));
              } else {
                errors.push(e);
              }
            }
          }
        }
      }

      if (errors) {
        throw new UnsubscriptionError$1(errors);
      }
    };

    Subscription.prototype.add = function (teardown) {
      var subscription = teardown;

      if (!teardown) {
        return Subscription.EMPTY;
      }

      switch (typeof teardown) {
        case 'function':
          subscription = new Subscription(teardown);

        case 'object':
          if (subscription === this || subscription.closed || typeof subscription.unsubscribe !== 'function') {
            return subscription;
          } else if (this.closed) {
            subscription.unsubscribe();
            return subscription;
          } else if (!(subscription instanceof Subscription)) {
            var tmp = subscription;
            subscription = new Subscription();
            subscription._subscriptions = [tmp];
          }

          break;

        default:
          {
            throw new Error('unrecognized teardown ' + teardown + ' added to Subscription.');
          }
      }

      var _parentOrParents = subscription._parentOrParents;

      if (_parentOrParents === null) {
        subscription._parentOrParents = this;
      } else if (_parentOrParents instanceof Subscription) {
        if (_parentOrParents === this) {
          return subscription;
        }

        subscription._parentOrParents = [_parentOrParents, this];
      } else if (_parentOrParents.indexOf(this) === -1) {
        _parentOrParents.push(this);
      } else {
        return subscription;
      }

      var subscriptions = this._subscriptions;

      if (subscriptions === null) {
        this._subscriptions = [subscription];
      } else {
        subscriptions.push(subscription);
      }

      return subscription;
    };

    Subscription.prototype.remove = function (subscription) {
      var subscriptions = this._subscriptions;

      if (subscriptions) {
        var subscriptionIndex = subscriptions.indexOf(subscription);

        if (subscriptionIndex !== -1) {
          subscriptions.splice(subscriptionIndex, 1);
        }
      }
    };

    Subscription.EMPTY = function (empty) {
      empty.closed = true;
      return empty;
    }(new Subscription());

    return Subscription;
  }();

  function flattenUnsubscriptionErrors$1(errors) {
    return errors.reduce(function (errs, err) {
      return errs.concat(err instanceof UnsubscriptionError$1 ? err.errors : err);
    }, []);
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var rxSubscriber$1 = typeof Symbol === 'function' ?
  /*@__PURE__*/
  Symbol('rxSubscriber') : '@@rxSubscriber_' +
  /*@__PURE__*/
  Math.random();

  /** PURE_IMPORTS_START tslib,_util_isFunction,_Observer,_Subscription,_internal_symbol_rxSubscriber,_config,_util_hostReportError PURE_IMPORTS_END */

  var Subscriber$1 =
  /*@__PURE__*/
  function (_super) {
    __extends(Subscriber, _super);

    function Subscriber(destinationOrNext, error, complete) {
      var _this = _super.call(this) || this;

      _this.syncErrorValue = null;
      _this.syncErrorThrown = false;
      _this.syncErrorThrowable = false;
      _this.isStopped = false;

      switch (arguments.length) {
        case 0:
          _this.destination = empty$1;
          break;

        case 1:
          if (!destinationOrNext) {
            _this.destination = empty$1;
            break;
          }

          if (typeof destinationOrNext === 'object') {
            if (destinationOrNext instanceof Subscriber) {
              _this.syncErrorThrowable = destinationOrNext.syncErrorThrowable;
              _this.destination = destinationOrNext;
              destinationOrNext.add(_this);
            } else {
              _this.syncErrorThrowable = true;
              _this.destination = new SafeSubscriber$1(_this, destinationOrNext);
            }

            break;
          }

        default:
          _this.syncErrorThrowable = true;
          _this.destination = new SafeSubscriber$1(_this, destinationOrNext, error, complete);
          break;
      }

      return _this;
    }

    Subscriber.prototype[rxSubscriber$1] = function () {
      return this;
    };

    Subscriber.create = function (next, error, complete) {
      var subscriber = new Subscriber(next, error, complete);
      subscriber.syncErrorThrowable = false;
      return subscriber;
    };

    Subscriber.prototype.next = function (value) {
      if (!this.isStopped) {
        this._next(value);
      }
    };

    Subscriber.prototype.error = function (err) {
      if (!this.isStopped) {
        this.isStopped = true;

        this._error(err);
      }
    };

    Subscriber.prototype.complete = function () {
      if (!this.isStopped) {
        this.isStopped = true;

        this._complete();
      }
    };

    Subscriber.prototype.unsubscribe = function () {
      if (this.closed) {
        return;
      }

      this.isStopped = true;

      _super.prototype.unsubscribe.call(this);
    };

    Subscriber.prototype._next = function (value) {
      this.destination.next(value);
    };

    Subscriber.prototype._error = function (err) {
      this.destination.error(err);
      this.unsubscribe();
    };

    Subscriber.prototype._complete = function () {
      this.destination.complete();
      this.unsubscribe();
    };

    Subscriber.prototype._unsubscribeAndRecycle = function () {
      var _parentOrParents = this._parentOrParents;
      this._parentOrParents = null;
      this.unsubscribe();
      this.closed = false;
      this.isStopped = false;
      this._parentOrParents = _parentOrParents;
      return this;
    };

    return Subscriber;
  }(Subscription$1);

  var SafeSubscriber$1 =
  /*@__PURE__*/
  function (_super) {
    __extends(SafeSubscriber, _super);

    function SafeSubscriber(_parentSubscriber, observerOrNext, error, complete) {
      var _this = _super.call(this) || this;

      _this._parentSubscriber = _parentSubscriber;
      var next;
      var context = _this;

      if (isFunction$1(observerOrNext)) {
        next = observerOrNext;
      } else if (observerOrNext) {
        next = observerOrNext.next;
        error = observerOrNext.error;
        complete = observerOrNext.complete;

        if (observerOrNext !== empty$1) {
          context = Object.create(observerOrNext);

          if (isFunction$1(context.unsubscribe)) {
            _this.add(context.unsubscribe.bind(context));
          }

          context.unsubscribe = _this.unsubscribe.bind(_this);
        }
      }

      _this._context = context;
      _this._next = next;
      _this._error = error;
      _this._complete = complete;
      return _this;
    }

    SafeSubscriber.prototype.next = function (value) {
      if (!this.isStopped && this._next) {
        var _parentSubscriber = this._parentSubscriber;

        if (!config$2.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
          this.__tryOrUnsub(this._next, value);
        } else if (this.__tryOrSetError(_parentSubscriber, this._next, value)) {
          this.unsubscribe();
        }
      }
    };

    SafeSubscriber.prototype.error = function (err) {
      if (!this.isStopped) {
        var _parentSubscriber = this._parentSubscriber;
        var useDeprecatedSynchronousErrorHandling = config$2.useDeprecatedSynchronousErrorHandling;

        if (this._error) {
          if (!useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
            this.__tryOrUnsub(this._error, err);

            this.unsubscribe();
          } else {
            this.__tryOrSetError(_parentSubscriber, this._error, err);

            this.unsubscribe();
          }
        } else if (!_parentSubscriber.syncErrorThrowable) {
          this.unsubscribe();

          if (useDeprecatedSynchronousErrorHandling) {
            throw err;
          }

          hostReportError$1(err);
        } else {
          if (useDeprecatedSynchronousErrorHandling) {
            _parentSubscriber.syncErrorValue = err;
            _parentSubscriber.syncErrorThrown = true;
          } else {
            hostReportError$1(err);
          }

          this.unsubscribe();
        }
      }
    };

    SafeSubscriber.prototype.complete = function () {
      var _this = this;

      if (!this.isStopped) {
        var _parentSubscriber = this._parentSubscriber;

        if (this._complete) {
          var wrappedComplete = function () {
            return _this._complete.call(_this._context);
          };

          if (!config$2.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
            this.__tryOrUnsub(wrappedComplete);

            this.unsubscribe();
          } else {
            this.__tryOrSetError(_parentSubscriber, wrappedComplete);

            this.unsubscribe();
          }
        } else {
          this.unsubscribe();
        }
      }
    };

    SafeSubscriber.prototype.__tryOrUnsub = function (fn, value) {
      try {
        fn.call(this._context, value);
      } catch (err) {
        this.unsubscribe();

        if (config$2.useDeprecatedSynchronousErrorHandling) {
          throw err;
        } else {
          hostReportError$1(err);
        }
      }
    };

    SafeSubscriber.prototype.__tryOrSetError = function (parent, fn, value) {
      if (!config$2.useDeprecatedSynchronousErrorHandling) {
        throw new Error('bad call');
      }

      try {
        fn.call(this._context, value);
      } catch (err) {
        if (config$2.useDeprecatedSynchronousErrorHandling) {
          parent.syncErrorValue = err;
          parent.syncErrorThrown = true;
          return true;
        } else {
          hostReportError$1(err);
          return true;
        }
      }

      return false;
    };

    SafeSubscriber.prototype._unsubscribe = function () {
      var _parentSubscriber = this._parentSubscriber;
      this._context = null;
      this._parentSubscriber = null;

      _parentSubscriber.unsubscribe();
    };

    return SafeSubscriber;
  }(Subscriber$1);

  /** PURE_IMPORTS_START _Subscriber PURE_IMPORTS_END */
  function canReportError$1(observer) {
    while (observer) {
      var _a = observer,
          closed_1 = _a.closed,
          destination = _a.destination,
          isStopped = _a.isStopped;

      if (closed_1 || isStopped) {
        return false;
      } else if (destination && destination instanceof Subscriber$1) {
        observer = destination;
      } else {
        observer = null;
      }
    }

    return true;
  }

  /** PURE_IMPORTS_START _Subscriber,_symbol_rxSubscriber,_Observer PURE_IMPORTS_END */
  function toSubscriber$1(nextOrObserver, error, complete) {
    if (nextOrObserver) {
      if (nextOrObserver instanceof Subscriber$1) {
        return nextOrObserver;
      }

      if (nextOrObserver[rxSubscriber$1]) {
        return nextOrObserver[rxSubscriber$1]();
      }
    }

    if (!nextOrObserver && !error && !complete) {
      return new Subscriber$1(empty$1);
    }

    return new Subscriber$1(nextOrObserver, error, complete);
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var observable$1 = typeof Symbol === 'function' && Symbol.observable || '@@observable';

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function noop$2() {}

  /** PURE_IMPORTS_START _noop PURE_IMPORTS_END */
  function pipeFromArray$1(fns) {
    if (!fns) {
      return noop$2;
    }

    if (fns.length === 1) {
      return fns[0];
    }

    return function piped(input) {
      return fns.reduce(function (prev, fn) {
        return fn(prev);
      }, input);
    };
  }

  /** PURE_IMPORTS_START _util_canReportError,_util_toSubscriber,_symbol_observable,_util_pipe,_config PURE_IMPORTS_END */

  var Observable$1 =
  /*@__PURE__*/
  function () {
    function Observable(subscribe) {
      this._isScalar = false;

      if (subscribe) {
        this._subscribe = subscribe;
      }
    }

    Observable.prototype.lift = function (operator) {
      var observable = new Observable();
      observable.source = this;
      observable.operator = operator;
      return observable;
    };

    Observable.prototype.subscribe = function (observerOrNext, error, complete) {
      var operator = this.operator;
      var sink = toSubscriber$1(observerOrNext, error, complete);

      if (operator) {
        sink.add(operator.call(sink, this.source));
      } else {
        sink.add(this.source || config$2.useDeprecatedSynchronousErrorHandling && !sink.syncErrorThrowable ? this._subscribe(sink) : this._trySubscribe(sink));
      }

      if (config$2.useDeprecatedSynchronousErrorHandling) {
        if (sink.syncErrorThrowable) {
          sink.syncErrorThrowable = false;

          if (sink.syncErrorThrown) {
            throw sink.syncErrorValue;
          }
        }
      }

      return sink;
    };

    Observable.prototype._trySubscribe = function (sink) {
      try {
        return this._subscribe(sink);
      } catch (err) {
        if (config$2.useDeprecatedSynchronousErrorHandling) {
          sink.syncErrorThrown = true;
          sink.syncErrorValue = err;
        }

        if (canReportError$1(sink)) {
          sink.error(err);
        } else {
          console.warn(err);
        }
      }
    };

    Observable.prototype.forEach = function (next, promiseCtor) {
      var _this = this;

      promiseCtor = getPromiseCtor$1(promiseCtor);
      return new promiseCtor(function (resolve, reject) {
        var subscription;
        subscription = _this.subscribe(function (value) {
          try {
            next(value);
          } catch (err) {
            reject(err);

            if (subscription) {
              subscription.unsubscribe();
            }
          }
        }, reject, resolve);
      });
    };

    Observable.prototype._subscribe = function (subscriber) {
      var source = this.source;
      return source && source.subscribe(subscriber);
    };

    Observable.prototype[observable$1] = function () {
      return this;
    };

    Observable.prototype.pipe = function () {
      var operations = [];

      for (var _i = 0; _i < arguments.length; _i++) {
        operations[_i] = arguments[_i];
      }

      if (operations.length === 0) {
        return this;
      }

      return pipeFromArray$1(operations)(this);
    };

    Observable.prototype.toPromise = function (promiseCtor) {
      var _this = this;

      promiseCtor = getPromiseCtor$1(promiseCtor);
      return new promiseCtor(function (resolve, reject) {
        var value;

        _this.subscribe(function (x) {
          return value = x;
        }, function (err) {
          return reject(err);
        }, function () {
          return resolve(value);
        });
      });
    };

    Observable.create = function (subscribe) {
      return new Observable(subscribe);
    };

    return Observable;
  }();

  function getPromiseCtor$1(promiseCtor) {
    if (!promiseCtor) {
      promiseCtor = Promise;
    }

    if (!promiseCtor) {
      throw new Error('no Promise impl found');
    }

    return promiseCtor;
  }

  var EMPTY_HEX = hexValueType('0x');

  var Pss =
  /*#__PURE__*/
  function () {
    function Pss(rpc) {
      _defineProperty(this, "_rpc", void 0);

      if (!rpc.canSubscribe) {
        throw new Error('Invalid RPC instance provided: must support subscriptions');
      }

      this._rpc = rpc;
    }

    var _proto = Pss.prototype;

    _proto.baseAddr = function baseAddr() {
      return this._rpc.request('pss_baseAddr').then(hexValueType);
    };

    _proto.getPublicKey = function getPublicKey() {
      return this._rpc.request('pss_getPublicKey').then(hexValueType);
    };

    _proto.sendAsym = function sendAsym(key, topic, message) {
      return this._rpc.request('pss_sendAsym', [key, topic, createHex(message).value]);
    };

    _proto.sendSym = function sendSym(keyID, topic, message) {
      return this._rpc.request('pss_sendSym', [keyID, topic, createHex(message).value]);
    };

    _proto.sendRaw = function sendRaw(address, topic, message) {
      if (address === void 0) {
        address = EMPTY_HEX;
      }

      return this._rpc.request('pss_sendRaw', [address, topic, createHex(message).value]);
    };

    _proto.setPeerPublicKey = function setPeerPublicKey(key, topic, address) {
      if (address === void 0) {
        address = EMPTY_HEX;
      }

      return this._rpc.request('pss_setPeerPublicKey', [key, topic, address]);
    };

    _proto.setSymmetricKey = function setSymmetricKey(key, topic, address, useForDecryption) {
      if (address === void 0) {
        address = EMPTY_HEX;
      }

      if (useForDecryption === void 0) {
        useForDecryption = false;
      }

      return this._rpc.request('pss_setSymmetricKey', [key, topic, address, useForDecryption]);
    };

    _proto.stringToTopic = function stringToTopic(str) {
      return this._rpc.request('pss_stringToTopic', [str]).then(hexValueType);
    };

    _proto.subscribeTopic = function subscribeTopic(topic, handleRawMessages) {
      if (handleRawMessages === void 0) {
        handleRawMessages = false;
      }

      return this._rpc.request('pss_subscribe', ['receive', topic, handleRawMessages, false]).then(hexValueType);
    };

    _proto.createSubscription = function createSubscription(subscription) {
      var _this = this;

      return Observable$1.create(function (observer) {
        return _this._rpc.subscribe({
          next: function next(msg) {
            if (msg.method === 'pss_subscription' && msg.params != null && msg.params.subscription === subscription) {
              var result = msg.params.result;

              if (result != null) {
                try {
                  observer.next({
                    key: result.Key && result.Key.length ? result.Key : undefined,
                    msg: createHex(result.Msg)
                  });
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.warn('Error handling message', result, err);
                }
              }
            }
          },
          error: function error(err) {
            observer.error(err);
          },
          complete: function complete() {
            observer.complete();
          }
        });
      });
    };

    _proto.createTopicSubscription = function createTopicSubscription(topic, handleRawMessages) {
      var _this2 = this;

      return this.subscribeTopic(topic, handleRawMessages).then(function (subscription) {
        return _this2.createSubscription(subscription);
      });
    };

    return Pss;
  }();

  function _assertThisInitialized$1(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  function _inheritsLoose$1(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  function _defineProperty$1(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _defineProperties$1(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass$1(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties$1(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties$1(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty$2(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  {
    if (typeof self === 'undefined' || !self.crypto && !self.msCrypto) {
      throw new Error('Your browser does not have secure random generator. ' + 'If you don’t need unpredictable IDs, you can use nanoid/non-secure.');
    }
  }

  var crypto = self.crypto || self.msCrypto;
  /*
   * This alphabet uses a-z A-Z 0-9 _- symbols.
   * Symbols order was changed for better gzip compression.
   */

  var url = 'Uint8ArdomValuesObj012345679BCDEFGHIJKLMNPQRSTWXYZ_cfghkpqvwxyz-';

  var index_browser = function (size) {
    size = size || 21;
    var id = '';
    var bytes = crypto.getRandomValues(new Uint8Array(size));

    while (0 < size--) {
      id += url[bytes[size] & 63];
    }

    return id;
  };

  var BaseRPC =
  /*#__PURE__*/
  function () {
    function BaseRPC(canSubscribe) {
      if (canSubscribe === void 0) {
        canSubscribe = false;
      }

      _defineProperty$2(this, "_canSubscribe", void 0);

      this._canSubscribe = canSubscribe;
    }

    var _proto = BaseRPC.prototype;

    _proto.createId = function createId() {
      return index_browser();
    };

    _createClass$1(BaseRPC, [{
      key: "canSubscribe",
      get: function get() {
        return this._canSubscribe === true;
      }
    }]);

    return BaseRPC;
  }();

  function _assertThisInitialized$2(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  function _inheritsLoose$2(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  function _getPrototypeOf$1(o) {
    _getPrototypeOf$1 = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf$1(o);
  }

  function _setPrototypeOf$1(o, p) {
    _setPrototypeOf$1 = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf$1(o, p);
  }

  function _isNativeFunction$1(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
  }

  function isNativeReflectConstruct$1() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;

    try {
      Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function _construct$1(Parent, args, Class) {
    if (isNativeReflectConstruct$1()) {
      _construct$1 = Reflect.construct;
    } else {
      _construct$1 = function _construct(Parent, args, Class) {
        var a = [null];
        a.push.apply(a, args);
        var Constructor = Function.bind.apply(Parent, a);
        var instance = new Constructor();
        if (Class) _setPrototypeOf$1(instance, Class.prototype);
        return instance;
      };
    }

    return _construct$1.apply(null, arguments);
  }

  function _wrapNativeSuper$1(Class) {
    var _cache = typeof Map === "function" ? new Map() : undefined;

    _wrapNativeSuper$1 = function _wrapNativeSuper(Class) {
      if (Class === null || !_isNativeFunction$1(Class)) return Class;

      if (typeof Class !== "function") {
        throw new TypeError("Super expression must either be null or a function");
      }

      if (typeof _cache !== "undefined") {
        if (_cache.has(Class)) return _cache.get(Class);

        _cache.set(Class, Wrapper);
      }

      function Wrapper() {
        return _construct$1(Class, arguments, _getPrototypeOf$1(this).constructor);
      }

      Wrapper.prototype = Object.create(Class.prototype, {
        constructor: {
          value: Wrapper,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      return _setPrototypeOf$1(Wrapper, Class);
    };

    return _wrapNativeSuper$1(Class);
  }

  function _defineProperty$3(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  var _ERROR_MESSAGE;

  var ERROR_CODE;

  (function (ERROR_CODE) {
    ERROR_CODE[ERROR_CODE["PARSE_ERROR"] = -32700] = "PARSE_ERROR";
    ERROR_CODE[ERROR_CODE["INVALID_REQUEST"] = -32600] = "INVALID_REQUEST";
    ERROR_CODE[ERROR_CODE["METHOD_NOT_FOUND"] = -32601] = "METHOD_NOT_FOUND";
    ERROR_CODE[ERROR_CODE["INVALID_PARAMS"] = -32602] = "INVALID_PARAMS";
    ERROR_CODE[ERROR_CODE["INTERNAL_ERROR"] = -32603] = "INTERNAL_ERROR";
  })(ERROR_CODE || (ERROR_CODE = {}));

  var ERROR_MESSAGE = (_ERROR_MESSAGE = {}, _ERROR_MESSAGE[ERROR_CODE.PARSE_ERROR] = 'Parse error', _ERROR_MESSAGE[ERROR_CODE.INVALID_REQUEST] = 'Invalid request', _ERROR_MESSAGE[ERROR_CODE.METHOD_NOT_FOUND] = 'Method not found', _ERROR_MESSAGE[ERROR_CODE.INVALID_PARAMS] = 'Invalid params', _ERROR_MESSAGE[ERROR_CODE.INTERNAL_ERROR] = 'Internal error', _ERROR_MESSAGE);
  function isServerError(code) {
    return -32000 >= code && code >= -32099;
  }
  function getErrorMessage(code) {
    return ERROR_MESSAGE[code] || (isServerError(code) ? 'Server error' : 'Application error');
  }

  var RPCError =
  /*#__PURE__*/
  function (_Error) {
    _inheritsLoose$2(RPCError, _Error);

    RPCError.fromObject = function fromObject(err) {
      return new RPCError(err.code, err.message, err.data);
    };

    function RPCError(code, message, data) {
      var _this;

      _this = _Error.call(this) || this;

      _defineProperty$3(_assertThisInitialized$2(_this), "code", void 0);

      _defineProperty$3(_assertThisInitialized$2(_this), "data", void 0);

      _defineProperty$3(_assertThisInitialized$2(_this), "message", void 0);

      _this.code = code;
      _this.data = data;
      _this.message = message || getErrorMessage(code);
      return _this;
    }

    var _proto = RPCError.prototype;

    _proto.toObject = function toObject() {
      return {
        code: this.code,
        data: this.data,
        message: this.message
      };
    };

    return RPCError;
  }(_wrapNativeSuper$1(Error));

  function createErrorFactory(code) {
    var message = ERROR_MESSAGE[code];
    return function createError(data) {
      return new RPCError(code, message, data);
    };
  }

  var parseError = createErrorFactory(ERROR_CODE.PARSE_ERROR);
  var invalidRequest = createErrorFactory(ERROR_CODE.INVALID_REQUEST);
  var methodNotFound = createErrorFactory(ERROR_CODE.METHOD_NOT_FOUND);
  var invalidParams = createErrorFactory(ERROR_CODE.INVALID_PARAMS);
  var internalError = createErrorFactory(ERROR_CODE.INTERNAL_ERROR);

  var RequestRPC =
  /*#__PURE__*/
  function (_BaseRPC) {
    _inheritsLoose$1(RequestRPC, _BaseRPC);

    function RequestRPC(fetch) {
      var _this;

      _this = _BaseRPC.call(this, false) || this;

      _defineProperty$1(_assertThisInitialized$1(_this), "_fetch", void 0);

      _this._fetch = fetch;
      return _this;
    }

    var _proto = RequestRPC.prototype;

    _proto.request = function request(method, params) {
      return this._fetch({
        id: this.createId(),
        jsonrpc: '2.0',
        method: method,
        params: params
      }).then(function (msg) {
        if (msg.error) {
          throw RPCError.fromObject(msg.error);
        }

        return msg.result;
      });
    };

    return RequestRPC;
  }(BaseRPC);

  function _assertThisInitialized$3(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  function _inheritsLoose$3(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  function _getPrototypeOf$2(o) {
    _getPrototypeOf$2 = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf$2(o);
  }

  function _setPrototypeOf$2(o, p) {
    _setPrototypeOf$2 = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf$2(o, p);
  }

  function _isNativeFunction$2(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
  }

  function isNativeReflectConstruct$2() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;

    try {
      Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function _construct$2(Parent, args, Class) {
    if (isNativeReflectConstruct$2()) {
      _construct$2 = Reflect.construct;
    } else {
      _construct$2 = function _construct(Parent, args, Class) {
        var a = [null];
        a.push.apply(a, args);
        var Constructor = Function.bind.apply(Parent, a);
        var instance = new Constructor();
        if (Class) _setPrototypeOf$2(instance, Class.prototype);
        return instance;
      };
    }

    return _construct$2.apply(null, arguments);
  }

  function _wrapNativeSuper$2(Class) {
    var _cache = typeof Map === "function" ? new Map() : undefined;

    _wrapNativeSuper$2 = function _wrapNativeSuper(Class) {
      if (Class === null || !_isNativeFunction$2(Class)) return Class;

      if (typeof Class !== "function") {
        throw new TypeError("Super expression must either be null or a function");
      }

      if (typeof _cache !== "undefined") {
        if (_cache.has(Class)) return _cache.get(Class);

        _cache.set(Class, Wrapper);
      }

      function Wrapper() {
        return _construct$2(Class, arguments, _getPrototypeOf$2(this).constructor);
      }

      Wrapper.prototype = Object.create(Class.prototype, {
        constructor: {
          value: Wrapper,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      return _setPrototypeOf$2(Wrapper, Class);
    };

    return _wrapNativeSuper$2(Class);
  }

  function _defineProperty$4(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  var HEADERS = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
  var METHOD = 'POST';
  var HTTPError$1 =
  /*#__PURE__*/
  function (_Error) {
    _inheritsLoose$3(HTTPError, _Error);

    function HTTPError(status, message) {
      var _this;

      _this = _Error.call(this, message) || this;

      _defineProperty$4(_assertThisInitialized$3(_this), "status", void 0);

      _this.status = status;
      return _this;
    }

    return HTTPError;
  }(_wrapNativeSuper$2(Error));
  function resOrError$1(res) {
    return res.ok ? Promise.resolve(res) : Promise.reject(new HTTPError$1(res.status, res.statusText));
  }
  function createTransport(url) {
    return function request(data) {
      var request = {
        body: JSON.stringify(data),
        headers: HEADERS,
        method: METHOD
      };
      return fetch(url, request).then(resOrError$1).then(function (res) {
        return res.json();
      });
    };
  }

  function createRPC(url) {
    return new RequestRPC(createTransport(url));
  }

  function _setPrototypeOf$3(o, p) {
    _setPrototypeOf$3 = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf$3(o, p);
  }

  function isNativeReflectConstruct$3() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;

    try {
      Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function _construct$3(Parent, args, Class) {
    if (isNativeReflectConstruct$3()) {
      _construct$3 = Reflect.construct;
    } else {
      _construct$3 = function _construct(Parent, args, Class) {
        var a = [null];
        a.push.apply(a, args);
        var Constructor = Function.bind.apply(Parent, a);
        var instance = new Constructor();
        if (Class) _setPrototypeOf$3(instance, Class.prototype);
        return instance;
      };
    }

    return _construct$3.apply(null, arguments);
  }

  function _defineProperties$2(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass$2(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties$2(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties$2(Constructor, staticProps);
    return Constructor;
  }

  function _assertThisInitialized$4(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  function _inheritsLoose$4(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  function _defineProperty$5(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function isFunction$2(x) {
    return typeof x === 'function';
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var _enable_super_gross_mode_that_will_cause_bad_things$2 = false;
  var config$3 = {
    Promise: undefined,

    set useDeprecatedSynchronousErrorHandling(value) {
      if (value) {
        var error =
        /*@__PURE__*/
        new Error();
        /*@__PURE__*/

        console.warn('DEPRECATED! RxJS was set to use deprecated synchronous error handling behavior by code at: \n' + error.stack);
      }

      _enable_super_gross_mode_that_will_cause_bad_things$2 = value;
    },

    get useDeprecatedSynchronousErrorHandling() {
      return _enable_super_gross_mode_that_will_cause_bad_things$2;
    }

  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function hostReportError$2(err) {
    setTimeout(function () {
      throw err;
    }, 0);
  }

  /** PURE_IMPORTS_START _config,_util_hostReportError PURE_IMPORTS_END */
  var empty$2 = {
    closed: true,
    next: function (value) {},
    error: function (err) {
      if (config$3.useDeprecatedSynchronousErrorHandling) {
        throw err;
      } else {
        hostReportError$2(err);
      }
    },
    complete: function () {}
  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var isArray$3 = Array.isArray || function (x) {
    return x && typeof x.length === 'number';
  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function isObject$2(x) {
    return x !== null && typeof x === 'object';
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function UnsubscriptionErrorImpl$2(errors) {
    Error.call(this);
    this.message = errors ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) {
      return i + 1 + ") " + err.toString();
    }).join('\n  ') : '';
    this.name = 'UnsubscriptionError';
    this.errors = errors;
    return this;
  }

  UnsubscriptionErrorImpl$2.prototype =
  /*@__PURE__*/
  Object.create(Error.prototype);
  var UnsubscriptionError$2 = UnsubscriptionErrorImpl$2;

  /** PURE_IMPORTS_START _util_isArray,_util_isObject,_util_isFunction,_util_UnsubscriptionError PURE_IMPORTS_END */

  var Subscription$2 =
  /*@__PURE__*/
  function () {
    function Subscription(unsubscribe) {
      this.closed = false;
      this._parentOrParents = null;
      this._subscriptions = null;

      if (unsubscribe) {
        this._unsubscribe = unsubscribe;
      }
    }

    Subscription.prototype.unsubscribe = function () {
      var errors;

      if (this.closed) {
        return;
      }

      var _a = this,
          _parentOrParents = _a._parentOrParents,
          _unsubscribe = _a._unsubscribe,
          _subscriptions = _a._subscriptions;

      this.closed = true;
      this._parentOrParents = null;
      this._subscriptions = null;

      if (_parentOrParents instanceof Subscription) {
        _parentOrParents.remove(this);
      } else if (_parentOrParents !== null) {
        for (var index = 0; index < _parentOrParents.length; ++index) {
          var parent_1 = _parentOrParents[index];
          parent_1.remove(this);
        }
      }

      if (isFunction$2(_unsubscribe)) {
        try {
          _unsubscribe.call(this);
        } catch (e) {
          errors = e instanceof UnsubscriptionError$2 ? flattenUnsubscriptionErrors$2(e.errors) : [e];
        }
      }

      if (isArray$3(_subscriptions)) {
        var index = -1;
        var len = _subscriptions.length;

        while (++index < len) {
          var sub = _subscriptions[index];

          if (isObject$2(sub)) {
            try {
              sub.unsubscribe();
            } catch (e) {
              errors = errors || [];

              if (e instanceof UnsubscriptionError$2) {
                errors = errors.concat(flattenUnsubscriptionErrors$2(e.errors));
              } else {
                errors.push(e);
              }
            }
          }
        }
      }

      if (errors) {
        throw new UnsubscriptionError$2(errors);
      }
    };

    Subscription.prototype.add = function (teardown) {
      var subscription = teardown;

      switch (typeof teardown) {
        case 'function':
          subscription = new Subscription(teardown);

        case 'object':
          if (subscription === this || subscription.closed || typeof subscription.unsubscribe !== 'function') {
            return subscription;
          } else if (this.closed) {
            subscription.unsubscribe();
            return subscription;
          } else if (!(subscription instanceof Subscription)) {
            var tmp = subscription;
            subscription = new Subscription();
            subscription._subscriptions = [tmp];
          }

          break;

        default:
          {
            if (!teardown) {
              return Subscription.EMPTY;
            }

            throw new Error('unrecognized teardown ' + teardown + ' added to Subscription.');
          }
      }

      var _parentOrParents = subscription._parentOrParents;

      if (_parentOrParents === null) {
        subscription._parentOrParents = this;
      } else if (_parentOrParents instanceof Subscription) {
        if (_parentOrParents === this) {
          return subscription;
        }

        subscription._parentOrParents = [_parentOrParents, this];
      } else if (_parentOrParents.indexOf(this) === -1) {
        _parentOrParents.push(this);
      } else {
        return subscription;
      }

      var subscriptions = this._subscriptions;

      if (subscriptions === null) {
        this._subscriptions = [subscription];
      } else {
        subscriptions.push(subscription);
      }

      return subscription;
    };

    Subscription.prototype.remove = function (subscription) {
      var subscriptions = this._subscriptions;

      if (subscriptions) {
        var subscriptionIndex = subscriptions.indexOf(subscription);

        if (subscriptionIndex !== -1) {
          subscriptions.splice(subscriptionIndex, 1);
        }
      }
    };

    Subscription.EMPTY = function (empty) {
      empty.closed = true;
      return empty;
    }(new Subscription());

    return Subscription;
  }();

  function flattenUnsubscriptionErrors$2(errors) {
    return errors.reduce(function (errs, err) {
      return errs.concat(err instanceof UnsubscriptionError$2 ? err.errors : err);
    }, []);
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var rxSubscriber$2 = typeof Symbol === 'function' ?
  /*@__PURE__*/
  Symbol('rxSubscriber') : '@@rxSubscriber_' +
  /*@__PURE__*/
  Math.random();

  /** PURE_IMPORTS_START tslib,_util_isFunction,_Observer,_Subscription,_internal_symbol_rxSubscriber,_config,_util_hostReportError PURE_IMPORTS_END */

  var Subscriber$2 =
  /*@__PURE__*/
  function (_super) {
    __extends(Subscriber, _super);

    function Subscriber(destinationOrNext, error, complete) {
      var _this = _super.call(this) || this;

      _this.syncErrorValue = null;
      _this.syncErrorThrown = false;
      _this.syncErrorThrowable = false;
      _this.isStopped = false;

      switch (arguments.length) {
        case 0:
          _this.destination = empty$2;
          break;

        case 1:
          if (!destinationOrNext) {
            _this.destination = empty$2;
            break;
          }

          if (typeof destinationOrNext === 'object') {
            if (destinationOrNext instanceof Subscriber) {
              _this.syncErrorThrowable = destinationOrNext.syncErrorThrowable;
              _this.destination = destinationOrNext;
              destinationOrNext.add(_this);
            } else {
              _this.syncErrorThrowable = true;
              _this.destination = new SafeSubscriber$2(_this, destinationOrNext);
            }

            break;
          }

        default:
          _this.syncErrorThrowable = true;
          _this.destination = new SafeSubscriber$2(_this, destinationOrNext, error, complete);
          break;
      }

      return _this;
    }

    Subscriber.prototype[rxSubscriber$2] = function () {
      return this;
    };

    Subscriber.create = function (next, error, complete) {
      var subscriber = new Subscriber(next, error, complete);
      subscriber.syncErrorThrowable = false;
      return subscriber;
    };

    Subscriber.prototype.next = function (value) {
      if (!this.isStopped) {
        this._next(value);
      }
    };

    Subscriber.prototype.error = function (err) {
      if (!this.isStopped) {
        this.isStopped = true;

        this._error(err);
      }
    };

    Subscriber.prototype.complete = function () {
      if (!this.isStopped) {
        this.isStopped = true;

        this._complete();
      }
    };

    Subscriber.prototype.unsubscribe = function () {
      if (this.closed) {
        return;
      }

      this.isStopped = true;

      _super.prototype.unsubscribe.call(this);
    };

    Subscriber.prototype._next = function (value) {
      this.destination.next(value);
    };

    Subscriber.prototype._error = function (err) {
      this.destination.error(err);
      this.unsubscribe();
    };

    Subscriber.prototype._complete = function () {
      this.destination.complete();
      this.unsubscribe();
    };

    Subscriber.prototype._unsubscribeAndRecycle = function () {
      var _parentOrParents = this._parentOrParents;
      this._parentOrParents = null;
      this.unsubscribe();
      this.closed = false;
      this.isStopped = false;
      this._parentOrParents = _parentOrParents;
      return this;
    };

    return Subscriber;
  }(Subscription$2);

  var SafeSubscriber$2 =
  /*@__PURE__*/
  function (_super) {
    __extends(SafeSubscriber, _super);

    function SafeSubscriber(_parentSubscriber, observerOrNext, error, complete) {
      var _this = _super.call(this) || this;

      _this._parentSubscriber = _parentSubscriber;
      var next;
      var context = _this;

      if (isFunction$2(observerOrNext)) {
        next = observerOrNext;
      } else if (observerOrNext) {
        next = observerOrNext.next;
        error = observerOrNext.error;
        complete = observerOrNext.complete;

        if (observerOrNext !== empty$2) {
          context = Object.create(observerOrNext);

          if (isFunction$2(context.unsubscribe)) {
            _this.add(context.unsubscribe.bind(context));
          }

          context.unsubscribe = _this.unsubscribe.bind(_this);
        }
      }

      _this._context = context;
      _this._next = next;
      _this._error = error;
      _this._complete = complete;
      return _this;
    }

    SafeSubscriber.prototype.next = function (value) {
      if (!this.isStopped && this._next) {
        var _parentSubscriber = this._parentSubscriber;

        if (!config$3.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
          this.__tryOrUnsub(this._next, value);
        } else if (this.__tryOrSetError(_parentSubscriber, this._next, value)) {
          this.unsubscribe();
        }
      }
    };

    SafeSubscriber.prototype.error = function (err) {
      if (!this.isStopped) {
        var _parentSubscriber = this._parentSubscriber;
        var useDeprecatedSynchronousErrorHandling = config$3.useDeprecatedSynchronousErrorHandling;

        if (this._error) {
          if (!useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
            this.__tryOrUnsub(this._error, err);

            this.unsubscribe();
          } else {
            this.__tryOrSetError(_parentSubscriber, this._error, err);

            this.unsubscribe();
          }
        } else if (!_parentSubscriber.syncErrorThrowable) {
          this.unsubscribe();

          if (useDeprecatedSynchronousErrorHandling) {
            throw err;
          }

          hostReportError$2(err);
        } else {
          if (useDeprecatedSynchronousErrorHandling) {
            _parentSubscriber.syncErrorValue = err;
            _parentSubscriber.syncErrorThrown = true;
          } else {
            hostReportError$2(err);
          }

          this.unsubscribe();
        }
      }
    };

    SafeSubscriber.prototype.complete = function () {
      var _this = this;

      if (!this.isStopped) {
        var _parentSubscriber = this._parentSubscriber;

        if (this._complete) {
          var wrappedComplete = function () {
            return _this._complete.call(_this._context);
          };

          if (!config$3.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
            this.__tryOrUnsub(wrappedComplete);

            this.unsubscribe();
          } else {
            this.__tryOrSetError(_parentSubscriber, wrappedComplete);

            this.unsubscribe();
          }
        } else {
          this.unsubscribe();
        }
      }
    };

    SafeSubscriber.prototype.__tryOrUnsub = function (fn, value) {
      try {
        fn.call(this._context, value);
      } catch (err) {
        this.unsubscribe();

        if (config$3.useDeprecatedSynchronousErrorHandling) {
          throw err;
        } else {
          hostReportError$2(err);
        }
      }
    };

    SafeSubscriber.prototype.__tryOrSetError = function (parent, fn, value) {
      if (!config$3.useDeprecatedSynchronousErrorHandling) {
        throw new Error('bad call');
      }

      try {
        fn.call(this._context, value);
      } catch (err) {
        if (config$3.useDeprecatedSynchronousErrorHandling) {
          parent.syncErrorValue = err;
          parent.syncErrorThrown = true;
          return true;
        } else {
          hostReportError$2(err);
          return true;
        }
      }

      return false;
    };

    SafeSubscriber.prototype._unsubscribe = function () {
      var _parentSubscriber = this._parentSubscriber;
      this._context = null;
      this._parentSubscriber = null;

      _parentSubscriber.unsubscribe();
    };

    return SafeSubscriber;
  }(Subscriber$2);

  /** PURE_IMPORTS_START _Subscriber PURE_IMPORTS_END */
  function canReportError$2(observer) {
    while (observer) {
      var _a = observer,
          closed_1 = _a.closed,
          destination = _a.destination,
          isStopped = _a.isStopped;

      if (closed_1 || isStopped) {
        return false;
      } else if (destination && destination instanceof Subscriber$2) {
        observer = destination;
      } else {
        observer = null;
      }
    }

    return true;
  }

  /** PURE_IMPORTS_START _Subscriber,_symbol_rxSubscriber,_Observer PURE_IMPORTS_END */
  function toSubscriber$2(nextOrObserver, error, complete) {
    if (nextOrObserver) {
      if (nextOrObserver instanceof Subscriber$2) {
        return nextOrObserver;
      }

      if (nextOrObserver[rxSubscriber$2]) {
        return nextOrObserver[rxSubscriber$2]();
      }
    }

    if (!nextOrObserver && !error && !complete) {
      return new Subscriber$2(empty$2);
    }

    return new Subscriber$2(nextOrObserver, error, complete);
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var observable$2 = typeof Symbol === 'function' && Symbol.observable || '@@observable';

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function noop$3() {}

  /** PURE_IMPORTS_START _noop PURE_IMPORTS_END */
  function pipeFromArray$2(fns) {
    if (!fns) {
      return noop$3;
    }

    if (fns.length === 1) {
      return fns[0];
    }

    return function piped(input) {
      return fns.reduce(function (prev, fn) {
        return fn(prev);
      }, input);
    };
  }

  /** PURE_IMPORTS_START _util_canReportError,_util_toSubscriber,_symbol_observable,_util_pipe,_config PURE_IMPORTS_END */

  var Observable$2 =
  /*@__PURE__*/
  function () {
    function Observable(subscribe) {
      this._isScalar = false;

      if (subscribe) {
        this._subscribe = subscribe;
      }
    }

    Observable.prototype.lift = function (operator) {
      var observable = new Observable();
      observable.source = this;
      observable.operator = operator;
      return observable;
    };

    Observable.prototype.subscribe = function (observerOrNext, error, complete) {
      var operator = this.operator;
      var sink = toSubscriber$2(observerOrNext, error, complete);

      if (operator) {
        sink.add(operator.call(sink, this.source));
      } else {
        sink.add(this.source || config$3.useDeprecatedSynchronousErrorHandling && !sink.syncErrorThrowable ? this._subscribe(sink) : this._trySubscribe(sink));
      }

      if (config$3.useDeprecatedSynchronousErrorHandling) {
        if (sink.syncErrorThrowable) {
          sink.syncErrorThrowable = false;

          if (sink.syncErrorThrown) {
            throw sink.syncErrorValue;
          }
        }
      }

      return sink;
    };

    Observable.prototype._trySubscribe = function (sink) {
      try {
        return this._subscribe(sink);
      } catch (err) {
        if (config$3.useDeprecatedSynchronousErrorHandling) {
          sink.syncErrorThrown = true;
          sink.syncErrorValue = err;
        }

        if (canReportError$2(sink)) {
          sink.error(err);
        } else {
          console.warn(err);
        }
      }
    };

    Observable.prototype.forEach = function (next, promiseCtor) {
      var _this = this;

      promiseCtor = getPromiseCtor$2(promiseCtor);
      return new promiseCtor(function (resolve, reject) {
        var subscription;
        subscription = _this.subscribe(function (value) {
          try {
            next(value);
          } catch (err) {
            reject(err);

            if (subscription) {
              subscription.unsubscribe();
            }
          }
        }, reject, resolve);
      });
    };

    Observable.prototype._subscribe = function (subscriber) {
      var source = this.source;
      return source && source.subscribe(subscriber);
    };

    Observable.prototype[observable$2] = function () {
      return this;
    };

    Observable.prototype.pipe = function () {
      var operations = [];

      for (var _i = 0; _i < arguments.length; _i++) {
        operations[_i] = arguments[_i];
      }

      if (operations.length === 0) {
        return this;
      }

      return pipeFromArray$2(operations)(this);
    };

    Observable.prototype.toPromise = function (promiseCtor) {
      var _this = this;

      promiseCtor = getPromiseCtor$2(promiseCtor);
      return new promiseCtor(function (resolve, reject) {
        var value;

        _this.subscribe(function (x) {
          return value = x;
        }, function (err) {
          return reject(err);
        }, function () {
          return resolve(value);
        });
      });
    };

    Observable.create = function (subscribe) {
      return new Observable(subscribe);
    };

    return Observable;
  }();

  function getPromiseCtor$2(promiseCtor) {
    if (!promiseCtor) {
      promiseCtor = Promise;
    }

    if (!promiseCtor) {
      throw new Error('no Promise impl found');
    }

    return promiseCtor;
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function ObjectUnsubscribedErrorImpl() {
    Error.call(this);
    this.message = 'object unsubscribed';
    this.name = 'ObjectUnsubscribedError';
    return this;
  }

  ObjectUnsubscribedErrorImpl.prototype =
  /*@__PURE__*/
  Object.create(Error.prototype);
  var ObjectUnsubscribedError = ObjectUnsubscribedErrorImpl;

  /** PURE_IMPORTS_START tslib,_Subscription PURE_IMPORTS_END */

  var SubjectSubscription =
  /*@__PURE__*/
  function (_super) {
    __extends(SubjectSubscription, _super);

    function SubjectSubscription(subject, subscriber) {
      var _this = _super.call(this) || this;

      _this.subject = subject;
      _this.subscriber = subscriber;
      _this.closed = false;
      return _this;
    }

    SubjectSubscription.prototype.unsubscribe = function () {
      if (this.closed) {
        return;
      }

      this.closed = true;
      var subject = this.subject;
      var observers = subject.observers;
      this.subject = null;

      if (!observers || observers.length === 0 || subject.isStopped || subject.closed) {
        return;
      }

      var subscriberIndex = observers.indexOf(this.subscriber);

      if (subscriberIndex !== -1) {
        observers.splice(subscriberIndex, 1);
      }
    };

    return SubjectSubscription;
  }(Subscription$2);

  /** PURE_IMPORTS_START tslib,_Observable,_Subscriber,_Subscription,_util_ObjectUnsubscribedError,_SubjectSubscription,_internal_symbol_rxSubscriber PURE_IMPORTS_END */

  var SubjectSubscriber =
  /*@__PURE__*/
  function (_super) {
    __extends(SubjectSubscriber, _super);

    function SubjectSubscriber(destination) {
      var _this = _super.call(this, destination) || this;

      _this.destination = destination;
      return _this;
    }

    return SubjectSubscriber;
  }(Subscriber$2);

  var Subject =
  /*@__PURE__*/
  function (_super) {
    __extends(Subject, _super);

    function Subject() {
      var _this = _super.call(this) || this;

      _this.observers = [];
      _this.closed = false;
      _this.isStopped = false;
      _this.hasError = false;
      _this.thrownError = null;
      return _this;
    }

    Subject.prototype[rxSubscriber$2] = function () {
      return new SubjectSubscriber(this);
    };

    Subject.prototype.lift = function (operator) {
      var subject = new AnonymousSubject(this, this);
      subject.operator = operator;
      return subject;
    };

    Subject.prototype.next = function (value) {
      if (this.closed) {
        throw new ObjectUnsubscribedError();
      }

      if (!this.isStopped) {
        var observers = this.observers;
        var len = observers.length;
        var copy = observers.slice();

        for (var i = 0; i < len; i++) {
          copy[i].next(value);
        }
      }
    };

    Subject.prototype.error = function (err) {
      if (this.closed) {
        throw new ObjectUnsubscribedError();
      }

      this.hasError = true;
      this.thrownError = err;
      this.isStopped = true;
      var observers = this.observers;
      var len = observers.length;
      var copy = observers.slice();

      for (var i = 0; i < len; i++) {
        copy[i].error(err);
      }

      this.observers.length = 0;
    };

    Subject.prototype.complete = function () {
      if (this.closed) {
        throw new ObjectUnsubscribedError();
      }

      this.isStopped = true;
      var observers = this.observers;
      var len = observers.length;
      var copy = observers.slice();

      for (var i = 0; i < len; i++) {
        copy[i].complete();
      }

      this.observers.length = 0;
    };

    Subject.prototype.unsubscribe = function () {
      this.isStopped = true;
      this.closed = true;
      this.observers = null;
    };

    Subject.prototype._trySubscribe = function (subscriber) {
      if (this.closed) {
        throw new ObjectUnsubscribedError();
      } else {
        return _super.prototype._trySubscribe.call(this, subscriber);
      }
    };

    Subject.prototype._subscribe = function (subscriber) {
      if (this.closed) {
        throw new ObjectUnsubscribedError();
      } else if (this.hasError) {
        subscriber.error(this.thrownError);
        return Subscription$2.EMPTY;
      } else if (this.isStopped) {
        subscriber.complete();
        return Subscription$2.EMPTY;
      } else {
        this.observers.push(subscriber);
        return new SubjectSubscription(this, subscriber);
      }
    };

    Subject.prototype.asObservable = function () {
      var observable = new Observable$2();
      observable.source = this;
      return observable;
    };

    Subject.create = function (destination, source) {
      return new AnonymousSubject(destination, source);
    };

    return Subject;
  }(Observable$2);

  var AnonymousSubject =
  /*@__PURE__*/
  function (_super) {
    __extends(AnonymousSubject, _super);

    function AnonymousSubject(destination, source) {
      var _this = _super.call(this) || this;

      _this.destination = destination;
      _this.source = source;
      return _this;
    }

    AnonymousSubject.prototype.next = function (value) {
      var destination = this.destination;

      if (destination && destination.next) {
        destination.next(value);
      }
    };

    AnonymousSubject.prototype.error = function (err) {
      var destination = this.destination;

      if (destination && destination.error) {
        this.destination.error(err);
      }
    };

    AnonymousSubject.prototype.complete = function () {
      var destination = this.destination;

      if (destination && destination.complete) {
        this.destination.complete();
      }
    };

    AnonymousSubject.prototype._subscribe = function (subscriber) {
      var source = this.source;

      if (source) {
        return this.source.subscribe(subscriber);
      } else {
        return Subscription$2.EMPTY;
      }
    };

    return AnonymousSubject;
  }(Subject);

  /** PURE_IMPORTS_START tslib,_Subscription PURE_IMPORTS_END */

  var Action$1 =
  /*@__PURE__*/
  function (_super) {
    __extends(Action, _super);

    function Action(scheduler, work) {
      return _super.call(this) || this;
    }

    Action.prototype.schedule = function (state, delay) {

      return this;
    };

    return Action;
  }(Subscription$2);

  /** PURE_IMPORTS_START tslib,_Action PURE_IMPORTS_END */

  var AsyncAction$1 =
  /*@__PURE__*/
  function (_super) {
    __extends(AsyncAction, _super);

    function AsyncAction(scheduler, work) {
      var _this = _super.call(this, scheduler, work) || this;

      _this.scheduler = scheduler;
      _this.work = work;
      _this.pending = false;
      return _this;
    }

    AsyncAction.prototype.schedule = function (state, delay) {
      if (delay === void 0) {
        delay = 0;
      }

      if (this.closed) {
        return this;
      }

      this.state = state;
      var id = this.id;
      var scheduler = this.scheduler;

      if (id != null) {
        this.id = this.recycleAsyncId(scheduler, id, delay);
      }

      this.pending = true;
      this.delay = delay;
      this.id = this.id || this.requestAsyncId(scheduler, this.id, delay);
      return this;
    };

    AsyncAction.prototype.requestAsyncId = function (scheduler, id, delay) {
      if (delay === void 0) {
        delay = 0;
      }

      return setInterval(scheduler.flush.bind(scheduler, this), delay);
    };

    AsyncAction.prototype.recycleAsyncId = function (scheduler, id, delay) {
      if (delay === void 0) {
        delay = 0;
      }

      if (delay !== null && this.delay === delay && this.pending === false) {
        return id;
      }

      clearInterval(id);
      return undefined;
    };

    AsyncAction.prototype.execute = function (state, delay) {
      if (this.closed) {
        return new Error('executing a cancelled action');
      }

      this.pending = false;

      var error = this._execute(state, delay);

      if (error) {
        return error;
      } else if (this.pending === false && this.id != null) {
        this.id = this.recycleAsyncId(this.scheduler, this.id, null);
      }
    };

    AsyncAction.prototype._execute = function (state, delay) {
      var errored = false;
      var errorValue = undefined;

      try {
        this.work(state);
      } catch (e) {
        errored = true;
        errorValue = !!e && e || new Error(e);
      }

      if (errored) {
        this.unsubscribe();
        return errorValue;
      }
    };

    AsyncAction.prototype._unsubscribe = function () {
      var id = this.id;
      var scheduler = this.scheduler;
      var actions = scheduler.actions;
      var index = actions.indexOf(this);
      this.work = null;
      this.state = null;
      this.pending = false;
      this.scheduler = null;

      if (index !== -1) {
        actions.splice(index, 1);
      }

      if (id != null) {
        this.id = this.recycleAsyncId(scheduler, id, null);
      }

      this.delay = null;
    };

    return AsyncAction;
  }(Action$1);

  /** PURE_IMPORTS_START tslib,_AsyncAction PURE_IMPORTS_END */

  var QueueAction =
  /*@__PURE__*/
  function (_super) {
    __extends(QueueAction, _super);

    function QueueAction(scheduler, work) {
      var _this = _super.call(this, scheduler, work) || this;

      _this.scheduler = scheduler;
      _this.work = work;
      return _this;
    }

    QueueAction.prototype.schedule = function (state, delay) {
      if (delay === void 0) {
        delay = 0;
      }

      if (delay > 0) {
        return _super.prototype.schedule.call(this, state, delay);
      }

      this.delay = delay;
      this.state = state;
      this.scheduler.flush(this);
      return this;
    };

    QueueAction.prototype.execute = function (state, delay) {
      return delay > 0 || this.closed ? _super.prototype.execute.call(this, state, delay) : this._execute(state, delay);
    };

    QueueAction.prototype.requestAsyncId = function (scheduler, id, delay) {
      if (delay === void 0) {
        delay = 0;
      }

      if (delay !== null && delay > 0 || delay === null && this.delay > 0) {
        return _super.prototype.requestAsyncId.call(this, scheduler, id, delay);
      }

      return scheduler.flush(this);
    };

    return QueueAction;
  }(AsyncAction$1);

  var Scheduler$1 =
  /*@__PURE__*/
  function () {
    function Scheduler(SchedulerAction, now) {
      if (now === void 0) {
        now = Scheduler.now;
      }

      this.SchedulerAction = SchedulerAction;
      this.now = now;
    }

    Scheduler.prototype.schedule = function (work, delay, state) {
      if (delay === void 0) {
        delay = 0;
      }

      return new this.SchedulerAction(this, work).schedule(state, delay);
    };

    Scheduler.now = function () {
      return Date.now();
    };

    return Scheduler;
  }();

  /** PURE_IMPORTS_START tslib,_Scheduler PURE_IMPORTS_END */

  var AsyncScheduler$1 =
  /*@__PURE__*/
  function (_super) {
    __extends(AsyncScheduler, _super);

    function AsyncScheduler(SchedulerAction, now) {
      if (now === void 0) {
        now = Scheduler$1.now;
      }

      var _this = _super.call(this, SchedulerAction, function () {
        if (AsyncScheduler.delegate && AsyncScheduler.delegate !== _this) {
          return AsyncScheduler.delegate.now();
        } else {
          return now();
        }
      }) || this;

      _this.actions = [];
      _this.active = false;
      _this.scheduled = undefined;
      return _this;
    }

    AsyncScheduler.prototype.schedule = function (work, delay, state) {
      if (delay === void 0) {
        delay = 0;
      }

      if (AsyncScheduler.delegate && AsyncScheduler.delegate !== this) {
        return AsyncScheduler.delegate.schedule(work, delay, state);
      } else {
        return _super.prototype.schedule.call(this, work, delay, state);
      }
    };

    AsyncScheduler.prototype.flush = function (action) {
      var actions = this.actions;

      if (this.active) {
        actions.push(action);
        return;
      }

      var error;
      this.active = true;

      do {
        if (error = action.execute(action.state, action.delay)) {
          break;
        }
      } while (action = actions.shift());

      this.active = false;

      if (error) {
        while (action = actions.shift()) {
          action.unsubscribe();
        }

        throw error;
      }
    };

    return AsyncScheduler;
  }(Scheduler$1);

  /** PURE_IMPORTS_START tslib,_AsyncScheduler PURE_IMPORTS_END */

  var QueueScheduler =
  /*@__PURE__*/
  function (_super) {
    __extends(QueueScheduler, _super);

    function QueueScheduler() {
      return _super !== null && _super.apply(this, arguments) || this;
    }

    return QueueScheduler;
  }(AsyncScheduler$1);

  /** PURE_IMPORTS_START _QueueAction,_QueueScheduler PURE_IMPORTS_END */
  var queue$1 =
  /*@__PURE__*/
  new QueueScheduler(QueueAction);

  /** PURE_IMPORTS_START _Observable PURE_IMPORTS_END */
  var EMPTY =
  /*@__PURE__*/
  new Observable$2(function (subscriber) {
    return subscriber.complete();
  });
  function empty$3(scheduler) {
    return scheduler ? emptyScheduled(scheduler) : EMPTY;
  }

  function emptyScheduled(scheduler) {
    return new Observable$2(function (subscriber) {
      return scheduler.schedule(function () {
        return subscriber.complete();
      });
    });
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function isScheduler$1(value) {
    return value && typeof value.schedule === 'function';
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var subscribeToArray$1 = function (array) {
    return function (subscriber) {
      for (var i = 0, len = array.length; i < len && !subscriber.closed; i++) {
        subscriber.next(array[i]);
      }

      subscriber.complete();
    };
  };

  /** PURE_IMPORTS_START _Observable,_Subscription PURE_IMPORTS_END */
  function scheduleArray$1(input, scheduler) {
    return new Observable$2(function (subscriber) {
      var sub = new Subscription$2();
      var i = 0;
      sub.add(scheduler.schedule(function () {
        if (i === input.length) {
          subscriber.complete();
          return;
        }

        subscriber.next(input[i++]);

        if (!subscriber.closed) {
          sub.add(this.schedule());
        }
      }));
      return sub;
    });
  }

  /** PURE_IMPORTS_START _Observable,_util_subscribeToArray,_scheduled_scheduleArray PURE_IMPORTS_END */
  function fromArray$1(input, scheduler) {
    if (!scheduler) {
      return new Observable$2(subscribeToArray$1(input));
    } else {
      return scheduleArray$1(input, scheduler);
    }
  }

  /** PURE_IMPORTS_START _util_isScheduler,_fromArray,_scheduled_scheduleArray PURE_IMPORTS_END */
  function of() {
    var args = [];

    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }

    var scheduler = args[args.length - 1];

    if (isScheduler$1(scheduler)) {
      args.pop();
      return scheduleArray$1(args, scheduler);
    } else {
      return fromArray$1(args);
    }
  }

  /** PURE_IMPORTS_START _Observable PURE_IMPORTS_END */
  function throwError(error, scheduler) {
    if (!scheduler) {
      return new Observable$2(function (subscriber) {
        return subscriber.error(error);
      });
    } else {
      return new Observable$2(function (subscriber) {
        return scheduler.schedule(dispatch$1, 0, {
          error: error,
          subscriber: subscriber
        });
      });
    }
  }

  function dispatch$1(_a) {
    var error = _a.error,
        subscriber = _a.subscriber;
    subscriber.error(error);
  }

  /** PURE_IMPORTS_START _observable_empty,_observable_of,_observable_throwError PURE_IMPORTS_END */

  var Notification =
  /*@__PURE__*/
  function () {
    function Notification(kind, value, error) {
      this.kind = kind;
      this.value = value;
      this.error = error;
      this.hasValue = kind === 'N';
    }

    Notification.prototype.observe = function (observer) {
      switch (this.kind) {
        case 'N':
          return observer.next && observer.next(this.value);

        case 'E':
          return observer.error && observer.error(this.error);

        case 'C':
          return observer.complete && observer.complete();
      }
    };

    Notification.prototype.do = function (next, error, complete) {
      var kind = this.kind;

      switch (kind) {
        case 'N':
          return next && next(this.value);

        case 'E':
          return error && error(this.error);

        case 'C':
          return complete && complete();
      }
    };

    Notification.prototype.accept = function (nextOrObserver, error, complete) {
      if (nextOrObserver && typeof nextOrObserver.next === 'function') {
        return this.observe(nextOrObserver);
      } else {
        return this.do(nextOrObserver, error, complete);
      }
    };

    Notification.prototype.toObservable = function () {
      var kind = this.kind;

      switch (kind) {
        case 'N':
          return of(this.value);

        case 'E':
          return throwError(this.error);

        case 'C':
          return empty$3();
      }

      throw new Error('unexpected notification kind value');
    };

    Notification.createNext = function (value) {
      if (typeof value !== 'undefined') {
        return new Notification('N', value);
      }

      return Notification.undefinedValueNotification;
    };

    Notification.createError = function (err) {
      return new Notification('E', undefined, err);
    };

    Notification.createComplete = function () {
      return Notification.completeNotification;
    };

    Notification.completeNotification = new Notification('C');
    Notification.undefinedValueNotification = new Notification('N', undefined);
    return Notification;
  }();

  /** PURE_IMPORTS_START tslib,_Subscriber,_Notification PURE_IMPORTS_END */

  var ObserveOnSubscriber =
  /*@__PURE__*/
  function (_super) {
    __extends(ObserveOnSubscriber, _super);

    function ObserveOnSubscriber(destination, scheduler, delay) {
      if (delay === void 0) {
        delay = 0;
      }

      var _this = _super.call(this, destination) || this;

      _this.scheduler = scheduler;
      _this.delay = delay;
      return _this;
    }

    ObserveOnSubscriber.dispatch = function (arg) {
      var notification = arg.notification,
          destination = arg.destination;
      notification.observe(destination);
      this.unsubscribe();
    };

    ObserveOnSubscriber.prototype.scheduleMessage = function (notification) {
      var destination = this.destination;
      destination.add(this.scheduler.schedule(ObserveOnSubscriber.dispatch, this.delay, new ObserveOnMessage(notification, this.destination)));
    };

    ObserveOnSubscriber.prototype._next = function (value) {
      this.scheduleMessage(Notification.createNext(value));
    };

    ObserveOnSubscriber.prototype._error = function (err) {
      this.scheduleMessage(Notification.createError(err));
      this.unsubscribe();
    };

    ObserveOnSubscriber.prototype._complete = function () {
      this.scheduleMessage(Notification.createComplete());
      this.unsubscribe();
    };

    return ObserveOnSubscriber;
  }(Subscriber$2);

  var ObserveOnMessage =
  /*@__PURE__*/
  function () {
    function ObserveOnMessage(notification, destination) {
      this.notification = notification;
      this.destination = destination;
    }

    return ObserveOnMessage;
  }();

  /** PURE_IMPORTS_START tslib,_Subject,_scheduler_queue,_Subscription,_operators_observeOn,_util_ObjectUnsubscribedError,_SubjectSubscription PURE_IMPORTS_END */

  var ReplaySubject =
  /*@__PURE__*/
  function (_super) {
    __extends(ReplaySubject, _super);

    function ReplaySubject(bufferSize, windowTime, scheduler) {
      if (bufferSize === void 0) {
        bufferSize = Number.POSITIVE_INFINITY;
      }

      if (windowTime === void 0) {
        windowTime = Number.POSITIVE_INFINITY;
      }

      var _this = _super.call(this) || this;

      _this.scheduler = scheduler;
      _this._events = [];
      _this._infiniteTimeWindow = false;
      _this._bufferSize = bufferSize < 1 ? 1 : bufferSize;
      _this._windowTime = windowTime < 1 ? 1 : windowTime;

      if (windowTime === Number.POSITIVE_INFINITY) {
        _this._infiniteTimeWindow = true;
        _this.next = _this.nextInfiniteTimeWindow;
      } else {
        _this.next = _this.nextTimeWindow;
      }

      return _this;
    }

    ReplaySubject.prototype.nextInfiniteTimeWindow = function (value) {
      var _events = this._events;

      _events.push(value);

      if (_events.length > this._bufferSize) {
        _events.shift();
      }

      _super.prototype.next.call(this, value);
    };

    ReplaySubject.prototype.nextTimeWindow = function (value) {
      this._events.push(new ReplayEvent(this._getNow(), value));

      this._trimBufferThenGetEvents();

      _super.prototype.next.call(this, value);
    };

    ReplaySubject.prototype._subscribe = function (subscriber) {
      var _infiniteTimeWindow = this._infiniteTimeWindow;

      var _events = _infiniteTimeWindow ? this._events : this._trimBufferThenGetEvents();

      var scheduler = this.scheduler;
      var len = _events.length;
      var subscription;

      if (this.closed) {
        throw new ObjectUnsubscribedError();
      } else if (this.isStopped || this.hasError) {
        subscription = Subscription$2.EMPTY;
      } else {
        this.observers.push(subscriber);
        subscription = new SubjectSubscription(this, subscriber);
      }

      if (scheduler) {
        subscriber.add(subscriber = new ObserveOnSubscriber(subscriber, scheduler));
      }

      if (_infiniteTimeWindow) {
        for (var i = 0; i < len && !subscriber.closed; i++) {
          subscriber.next(_events[i]);
        }
      } else {
        for (var i = 0; i < len && !subscriber.closed; i++) {
          subscriber.next(_events[i].value);
        }
      }

      if (this.hasError) {
        subscriber.error(this.thrownError);
      } else if (this.isStopped) {
        subscriber.complete();
      }

      return subscription;
    };

    ReplaySubject.prototype._getNow = function () {
      return (this.scheduler || queue$1).now();
    };

    ReplaySubject.prototype._trimBufferThenGetEvents = function () {
      var now = this._getNow();

      var _bufferSize = this._bufferSize;
      var _windowTime = this._windowTime;
      var _events = this._events;
      var eventsCount = _events.length;
      var spliceCount = 0;

      while (spliceCount < eventsCount) {
        if (now - _events[spliceCount].time < _windowTime) {
          break;
        }

        spliceCount++;
      }

      if (eventsCount > _bufferSize) {
        spliceCount = Math.max(spliceCount, eventsCount - _bufferSize);
      }

      if (spliceCount > 0) {
        _events.splice(0, spliceCount);
      }

      return _events;
    };

    return ReplaySubject;
  }(Subject);

  var ReplayEvent =
  /*@__PURE__*/
  function () {
    function ReplayEvent(time, value) {
      this.time = time;
      this.value = value;
    }

    return ReplayEvent;
  }();

  var StreamRPC =
  /*#__PURE__*/
  function (_BaseRPC) {
    _inheritsLoose$4(StreamRPC, _BaseRPC);

    function StreamRPC(transport) {
      var _this;

      _this = _BaseRPC.call(this, true) || this;

      _defineProperty$5(_assertThisInitialized$4(_this), "_observers", void 0);

      _defineProperty$5(_assertThisInitialized$4(_this), "_subscribers", void 0);

      _defineProperty$5(_assertThisInitialized$4(_this), "_subscription", void 0);

      _defineProperty$5(_assertThisInitialized$4(_this), "_transport", void 0);

      _this._observers = new Map();
      _this._subscribers = new Set();
      _this._transport = transport;

      _this.connect();

      return _this;
    }

    var _proto = StreamRPC.prototype;

    _proto.connect = function connect() {
      var _this2 = this;

      if (this.connected) {
        return;
      }

      var failed;
      this._subscription = this._transport.subscribe({
        next: function next(msg) {
          if (msg.id == null) {
            _this2._subscribers.forEach(function (o) {
              o.next(msg);
            });
          } else {
            var observer = _this2._observers.get(String(msg.id));

            if (observer != null) {
              if (msg.error != null) {
                var err = RPCError.fromObject(msg.error);
                observer.error(err);

                if (msg.id != null) {
                  _this2._observers.delete(String(msg.id));
                }
              } else {
                observer.next(msg.result);
              }
            } else {
              // eslint-disable-next-line no-console
              console.warn('Missing observer for message ID:', msg.id);
            }
          }
        },
        error: function error(event) {
          var err;

          if (event instanceof Error) {
            err = event;
          } else {
            err = new Error('Connection failed');
          }

          failed = err;

          _this2._observers.forEach(function (o) {
            o.error(err);
          });

          _this2._observers.clear();

          _this2._subscribers.forEach(function (o) {
            o.error(err);
          });

          _this2._subscribers.clear();
        },
        complete: function complete() {
          _this2._observers.forEach(function (o) {
            o.complete();
          });

          _this2._observers.clear();

          _this2._subscribers.forEach(function (o) {
            o.complete();
          });

          _this2._subscribers.clear();
        }
      });

      if (failed != null) {
        throw failed;
      }
    };

    _proto.disconnect = function disconnect() {
      this._transport.complete();
    };

    _proto.observe = function observe(method, params) {
      var _this3 = this;

      return Observable$2.create(function (observer) {
        var id = _this3.createId();

        var msg = {
          jsonrpc: '2.0',
          method: method,
          id: id,
          params: params
        };

        _this3._observers.set(id, new Subscriber$2(observer));

        _this3._transport.next(msg);

        return function () {
          _this3._observers.delete(id);
        };
      });
    };

    _proto.request = function request(method, params) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        if (_this4.connected) {
          var sub = _this4.observe(method, params).subscribe(function (value) {
            sub.unsubscribe();
            resolve(value);
          }, function (err) {
            sub.unsubscribe();
            reject(err);
          }, function () {
            sub.unsubscribe();
          });
        } else {
          reject(new Error('Not connected'));
        }
      });
    };

    _proto.notify = function notify(method, params) {
      this._transport.next({
        jsonrpc: '2.0',
        method: method,
        params: params
      });
    };

    _proto.subscribe = function subscribe() {
      var _this5 = this;

      if (!this.connected) {
        throw new Error('Not connected');
      }

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var subscriber = _construct$3(Subscriber$2, args);

      this._subscribers.add(subscriber);

      return function () {
        _this5._subscribers.delete(subscriber);
      };
    };

    _createClass$2(StreamRPC, [{
      key: "connected",
      get: function get() {
        return this._subscription != null && !this._subscription.closed;
      }
    }]);

    return StreamRPC;
  }(BaseRPC);

  /** PURE_IMPORTS_START tslib,_.._Subject,_.._Subscriber,_.._Observable,_.._Subscription,_.._ReplaySubject PURE_IMPORTS_END */
  var DEFAULT_WEBSOCKET_CONFIG = {
    url: '',
    deserializer: function (e) {
      return JSON.parse(e.data);
    },
    serializer: function (value) {
      return JSON.stringify(value);
    }
  };
  var WEBSOCKETSUBJECT_INVALID_ERROR_OBJECT = 'WebSocketSubject.error must be called with an object with an error code, and an optional reason: { code: number, reason: string }';

  var WebSocketSubject =
  /*@__PURE__*/
  function (_super) {
    __extends(WebSocketSubject, _super);

    function WebSocketSubject(urlConfigOrSource, destination) {
      var _this = _super.call(this) || this;

      if (urlConfigOrSource instanceof Observable$2) {
        _this.destination = destination;
        _this.source = urlConfigOrSource;
      } else {
        var config = _this._config = __assign({}, DEFAULT_WEBSOCKET_CONFIG);

        _this._output = new Subject();

        if (typeof urlConfigOrSource === 'string') {
          config.url = urlConfigOrSource;
        } else {
          for (var key in urlConfigOrSource) {
            if (urlConfigOrSource.hasOwnProperty(key)) {
              config[key] = urlConfigOrSource[key];
            }
          }
        }

        if (!config.WebSocketCtor && WebSocket) {
          config.WebSocketCtor = WebSocket;
        } else if (!config.WebSocketCtor) {
          throw new Error('no WebSocket constructor can be found');
        }

        _this.destination = new ReplaySubject();
      }

      return _this;
    }

    WebSocketSubject.prototype.lift = function (operator) {
      var sock = new WebSocketSubject(this._config, this.destination);
      sock.operator = operator;
      sock.source = this;
      return sock;
    };

    WebSocketSubject.prototype._resetState = function () {
      this._socket = null;

      if (!this.source) {
        this.destination = new ReplaySubject();
      }

      this._output = new Subject();
    };

    WebSocketSubject.prototype.multiplex = function (subMsg, unsubMsg, messageFilter) {
      var self = this;
      return new Observable$2(function (observer) {
        try {
          self.next(subMsg());
        } catch (err) {
          observer.error(err);
        }

        var subscription = self.subscribe(function (x) {
          try {
            if (messageFilter(x)) {
              observer.next(x);
            }
          } catch (err) {
            observer.error(err);
          }
        }, function (err) {
          return observer.error(err);
        }, function () {
          return observer.complete();
        });
        return function () {
          try {
            self.next(unsubMsg());
          } catch (err) {
            observer.error(err);
          }

          subscription.unsubscribe();
        };
      });
    };

    WebSocketSubject.prototype._connectSocket = function () {
      var _this = this;

      var _a = this._config,
          WebSocketCtor = _a.WebSocketCtor,
          protocol = _a.protocol,
          url = _a.url,
          binaryType = _a.binaryType;
      var observer = this._output;
      var socket = null;

      try {
        socket = protocol ? new WebSocketCtor(url, protocol) : new WebSocketCtor(url);
        this._socket = socket;

        if (binaryType) {
          this._socket.binaryType = binaryType;
        }
      } catch (e) {
        observer.error(e);
        return;
      }

      var subscription = new Subscription$2(function () {
        _this._socket = null;

        if (socket && socket.readyState === 1) {
          socket.close();
        }
      });

      socket.onopen = function (e) {
        var _socket = _this._socket;

        if (!_socket) {
          socket.close();

          _this._resetState();

          return;
        }

        var openObserver = _this._config.openObserver;

        if (openObserver) {
          openObserver.next(e);
        }

        var queue = _this.destination;
        _this.destination = Subscriber$2.create(function (x) {
          if (socket.readyState === 1) {
            try {
              var serializer = _this._config.serializer;
              socket.send(serializer(x));
            } catch (e) {
              _this.destination.error(e);
            }
          }
        }, function (e) {
          var closingObserver = _this._config.closingObserver;

          if (closingObserver) {
            closingObserver.next(undefined);
          }

          if (e && e.code) {
            socket.close(e.code, e.reason);
          } else {
            observer.error(new TypeError(WEBSOCKETSUBJECT_INVALID_ERROR_OBJECT));
          }

          _this._resetState();
        }, function () {
          var closingObserver = _this._config.closingObserver;

          if (closingObserver) {
            closingObserver.next(undefined);
          }

          socket.close();

          _this._resetState();
        });

        if (queue && queue instanceof ReplaySubject) {
          subscription.add(queue.subscribe(_this.destination));
        }
      };

      socket.onerror = function (e) {
        _this._resetState();

        observer.error(e);
      };

      socket.onclose = function (e) {
        _this._resetState();

        var closeObserver = _this._config.closeObserver;

        if (closeObserver) {
          closeObserver.next(e);
        }

        if (e.wasClean) {
          observer.complete();
        } else {
          observer.error(e);
        }
      };

      socket.onmessage = function (e) {
        try {
          var deserializer = _this._config.deserializer;
          observer.next(deserializer(e));
        } catch (err) {
          observer.error(err);
        }
      };
    };

    WebSocketSubject.prototype._subscribe = function (subscriber) {
      var _this = this;

      var source = this.source;

      if (source) {
        return source.subscribe(subscriber);
      }

      if (!this._socket) {
        this._connectSocket();
      }

      this._output.subscribe(subscriber);

      subscriber.add(function () {
        var _socket = _this._socket;

        if (_this._output.observers.length === 0) {
          if (_socket && _socket.readyState === 1) {
            _socket.close();
          }

          _this._resetState();
        }
      });
      return subscriber;
    };

    WebSocketSubject.prototype.unsubscribe = function () {
      var _socket = this._socket;

      if (_socket && _socket.readyState === 1) {
        _socket.close();
      }

      this._resetState();

      _super.prototype.unsubscribe.call(this);
    };

    return WebSocketSubject;
  }(AnonymousSubject);

  function createTransport$1(url) {
    return new WebSocketSubject({
      url: url
    });
  }

  function createRPC$1(url) {
    return new StreamRPC(createTransport$1(url));
  }

  var HTTP_RE = /^https?:\/\//i;
  var WS_RE = /^wss?:\/\//i;
  var wsRPC = createRPC$1;
  function createRPC$2(endpoint) {
    if (HTTP_RE.test(endpoint)) {
      return createRPC(endpoint);
    }

    if (WS_RE.test(endpoint)) {
      return createRPC$1(endpoint);
    }

    throw new Error('Invalid endpoint provided: expecting HTTP or WebSocket URL');
  }

  var createInstantiateAPI = function createInstantiateAPI(createRPC) {
    return function instantiateAPI(maybeInstance, Cls) {
      if (maybeInstance != null) {
        return maybeInstance instanceof Cls ? maybeInstance : // $FlowFixMe: instance type
        new Cls(createRPC(maybeInstance));
      }
    };
  };

  var BaseClient =
  /*#__PURE__*/
  function () {
    function BaseClient(config) {
      if (config === void 0) {
        config = {};
      }

      _defineProperty(this, "_rpc", void 0);

      this._rpc = config.rpc;
    }

    var _proto = BaseClient.prototype;

    _proto.disconnect = function disconnect() {
      // $FlowFixMe: disconnect method is only present in StreamRPC
      if (this._rpc != null && typeof this._rpc.disconnect === 'function') {
        this._rpc.disconnect();
      }
    };

    _createClass(BaseClient, [{
      key: "rpc",
      get: function get() {
        if (this._rpc == null) {
          throw new Error('Could not access RPC: missing in configuration provided to client');
        }

        return this._rpc;
      }
    }]);

    return BaseClient;
  }();

  var instantiateAPI = createInstantiateAPI(createRPC$2);

  var BrowserClient =
  /*#__PURE__*/
  function (_BaseClient) {
    _inheritsLoose(BrowserClient, _BaseClient);

    function BrowserClient(config) {
      var _this;

      if (config.rpc == null && config.ws != null) {
        config.rpc = wsRPC(config.ws);
      }

      _this = _BaseClient.call(this, config) || this;

      _defineProperty(_assertThisInitialized(_this), "_bzz", void 0);

      _defineProperty(_assertThisInitialized(_this), "_pss", void 0);

      if (config.bzz != null) {
        if (config.bzz instanceof Bzz) {
          _this._bzz = config.bzz;
        } else {
          _this._bzz = new Bzz(config.bzz);
        }
      } else if (typeof config.http === 'string') {
        _this._bzz = new Bzz({
          url: config.http
        });
      } // $FlowFixMe: instance type


      _this._pss = instantiateAPI(config.pss, Pss);
      return _this;
    }

    _createClass(BrowserClient, [{
      key: "bzz",
      get: function get() {
        if (this._bzz == null) {
          throw new Error('Missing Bzz instance or HTTP URL');
        }

        return this._bzz;
      }
    }, {
      key: "pss",
      get: function get() {
        if (this._pss == null) {
          this._pss = new Pss(this.rpc);
        }

        return this._pss;
      }
    }]);

    return BrowserClient;
  }(BaseClient);

  exports.BzzAPI = Bzz;
  exports.Hex = Hex;
  exports.PssAPI = Pss;
  exports.SwarmClient = BrowserClient;
  exports.createHex = createHex;
  exports.createRPC = createRPC$2;
  exports.hexValueType = hexValueType;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
