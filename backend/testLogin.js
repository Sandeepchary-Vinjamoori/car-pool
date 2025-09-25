const axios = require("axios");

async function testLogin() {
  try {
    const res = await axios.post("http://localhost:5000/api/auth/login", {
      email: "sathwikagorumutchu@gmail.com",
      password: "sathwika"
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}

testLogin();
