
const EMAIL_REGEX = /\S+@\S+\.\S+/;
const phonePattern = /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[\d\s\-\(\)]{7,}$|^[\+]?[1-9][\d\s\-\(\)]{6,}$/;
const namePattern = /^[a-zA-Z\s\-']+$/;

console.log("Username 'testcashier':", {
    allowed: /^[a-zA-Z0-9\s\-']+$/.test("testcashier"),
    isPhone: phonePattern.test("testcashier"),
    isEmail: EMAIL_REGEX.test("testcashier")
});

console.log("First Name 'Cashier':", {
    allowed: namePattern.test("Cashier"),
    isPhone: phonePattern.test("Cashier")
});

console.log("Email 'cashier@gmail.com':", {
    valid: EMAIL_REGEX.test("cashier@gmail.com")
});
