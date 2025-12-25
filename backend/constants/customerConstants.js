/**
 * Customer-related constants
 */

// Pagination constants
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_BILLS_PAGE_SIZE = 50; // Default pagination for bills list

// Search constants
const MAX_SEARCH_LENGTH = 100;

// Customer number format
const CUSTOMER_NUMBER_PREFIX = 'CUST';
const CUSTOMER_NUMBER_PADDING = 4;

// Phone number validation
const PHONE_REGEX = /^[6-9]\d{9}$/;
const PHONE_LENGTH = 10;

// Name validation
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

// Email validation (handled by express-validator)
const MAX_EMAIL_LENGTH = 255;

// Address validation
const MAX_STREET_LENGTH = 200;
const MAX_CITY_LENGTH = 50;
const MAX_STATE_LENGTH = 50;
const PINCODE_LENGTH = 6;
const PINCODE_REGEX = /^\d{6}$/;

// Notes validation
const MAX_NOTES_LENGTH = 500;

module.exports = {
    MAX_PAGE_SIZE,
    DEFAULT_PAGE_SIZE,
    DEFAULT_BILLS_PAGE_SIZE,
    MAX_SEARCH_LENGTH,
    CUSTOMER_NUMBER_PREFIX,
    CUSTOMER_NUMBER_PADDING,
    PHONE_REGEX,
    PHONE_LENGTH,
    MIN_NAME_LENGTH,
    MAX_NAME_LENGTH,
    MAX_EMAIL_LENGTH,
    MAX_STREET_LENGTH,
    MAX_CITY_LENGTH,
    MAX_STATE_LENGTH,
    PINCODE_LENGTH,
    PINCODE_REGEX,
    MAX_NOTES_LENGTH,
};

