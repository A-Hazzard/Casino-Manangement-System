
const validateNameField = (value) => {
  if (!value) return false;
  const allowedPattern = /^[a-zA-Z\s\-']+$/;
  const phonePattern = /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[\d\s\-\(\)]{7,}$|^[\+]?[1-9][\d\s\-\(\)]{6,}$/;
  const trimmed = value.trim();
  return (
    trimmed.length >= 2 &&
    allowedPattern.test(trimmed) &&
    !phonePattern.test(trimmed)
  );
};

console.log("Cashier:", validateNameField("Cashier"));
console.log("Account:", validateNameField("Account"));
console.log("testcashier:", validateNameField("testcashier"));
