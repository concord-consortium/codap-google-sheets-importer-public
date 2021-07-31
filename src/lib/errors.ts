export class InvalidRangeError extends Error {
  constructor() {
    super();
    Object.setPrototypeOf(this, InvalidRangeError.prototype);
  }
}

export class SpreadSheetNotFoundError extends Error {
  constructor() {
    super();
    Object.setPrototypeOf(this, SpreadSheetNotFoundError.prototype);
  }
}

export class GeneralAPIError extends Error {
  constructor() {
    super();
    Object.setPrototypeOf(this, GeneralAPIError.prototype);
  }
}
