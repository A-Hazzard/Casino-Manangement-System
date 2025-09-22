// Simple script to create a test user
const fetch = require("node-fetch");

async function createTestUser() {
  try {
    const response = await fetch("http://localhost:3000/api/test/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "testuser",
        emailAddress: "test@example.com",
        password: "password123",
      }),
    });

    const result = await response.json();
    console.log("Result:", result);
  } catch (error) {
    console.error("Error:", error);
  }
}

createTestUser();
