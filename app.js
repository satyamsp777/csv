const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
// const fs = require("@cyclic.sh/s3fs")(S3_BUCKET_NAME);
const path = require("path");
const axios = require("axios");

const app = express();

// Set storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `indus.csv`);
  },
});

// Initialize multer upload
const upload = multer({ storage });

// Set EJS as the template engine
app.set("view engine", "ejs");

// Serve static files
app.use(express.static("public"));

// Render the index page
app.get("/", (req, res) => {
  res.render("index", { message: null });
});

// Set up a route for file upload
app.post("/upload", upload.single("csvFile"), (req, res) => {
  // Check if a file was uploaded
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const results = [];

  // Read and parse the CSV file
  const filePath = path.join(__dirname, `uploads/${req.file.filename}`);
  fs.createReadStream(filePath)
    .pipe(csv({ skipLines: 17 })) // Skip the first 17 lines (headers)
    .on("data", (data) => {
      // Remove leading and trailing whitespace from specific fields
      const trimmedData = {
        "Sr.No.": data["Sr.No."],
        Date: data["Date"],
        Type: data["Type"],
        Description: data[" Description"].trim(),
        Debit: data[" Debit "].trim(),
        Credit: data["Credit "].trim(),
        Balance: data["Balance"],
      };
      results.push(trimmedData);
    })
    .on("end", () => {
      // Write the data to a JSON file
      const jsonFilePath = path.join(__dirname, "uploads/json/data.json");
      fs.writeFile(jsonFilePath, JSON.stringify(results), (err) => {
        if (err) {
          console.error("Error writing JSON file:", err);
          return res.status(500).send("Error writing JSON file.");
        }

        console.log("JSON file saved:", jsonFilePath);
        res.render("index", { message: "Data uploaded ." });
        // res.send("Data uploaded and JSON file saved.");
      });
    });
});

// extract data

// Read the JSON file
const jsonFilePath = "./uploads/json/data.json";
const jsonData = fs.readFileSync(jsonFilePath, "utf8");
const response = JSON.parse(jsonData);
// console.log(response);

const filteredData = response.filter(
  (entry) => entry.Type === "Transfer Credit"
);

const extractedData = filteredData
  .map((entry) => {
    const description = entry.Description || ""; // Set description to an empty string if it is undefined
    const numberMatch = description.match(/(?<=\/)\d+(?=\/)/);
    const number = numberMatch ? numberMatch[0] : null;
    const creditAmount = parseFloat(entry.Credit);
    return {
      UTR_Number: number,
      Credit_Amount: creditAmount,
    };
  })
  .filter(
    (entry, index, self) =>
      entry.UTR_Number !== null &&
      entry.UTR_Number !== "" &&
      index === self.findIndex((e) => e.UTR_Number === entry.UTR_Number)
  );

console.log(extractedData);

const login = async () => {
  try {
    let data = JSON.stringify({
      username: "Dafaexch9",
      password: "Strike1407",
      systemId: 10001,
      // recaptcha: 84059,
    });
    let config = {
      method: "post",
      maxBodyLength: Infinity,
      // url: "https://adminapi.bestlive.io/api/login",
      headers: {
        authority: "adminapi.bestlive.io",
        accept: "application/json, text/plain, */*",
        "accept-language": "en-IN,en;q=0.9,mr;q=0.8,lb;q=0.7",
        "cache-control": "no-cache, no-store",
        "content-type": "application/json",
        encryption: "false",
        origin: "https://admin.dafaexch9.com",
        referer: "https://admin.dafaexch9.com/",
        "sec-ch-ua":
          '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
      },
      data: data,
    };
    const response = await axios.post(
      "https://adminapi.bestlive.io/api/login",
      data,
      config
    );
    if (response.status !== 200) {
      response_value = {
        success: false,
        message: response.status,
      };
    } else {
      response_value = {
        success: true,
        data: response.data,
      };
      return (token = response.data.data.token);
    }
  } catch (err) {
    response_value = {
      success: false,
      message: err.message,
    };
  }
  console.log(response_value);
  return response_value;
};

// get requests from Wuwexchange
const getRequests = async (extractedData) => {
  try {
    let token = await login();
    let data = JSON.stringify({
      type: "",
      nType: "deposit",
      start_date: "",
      end_date: "",
      isFirst: 1,
    });
    let config = {
      method: "post",
      maxBodyLength: Infinity,
      headers: {
        authority: "adminapi.bestlive.io",
        accept: "application/json, text/plain, */*",
        "accept-language": "en-IN,en;q=0.9,mr;q=0.8,lb;q=0.7",
        authorization: `Bearer ${token}`,
        "cache-control": "no-cache, no-store",
        "content-type": "application/json",
        encryption: "false",
        origin: "https://admin.dafaexch9.com",
        referer: "https://admin.dafaexch9.com/",
        "sec-ch-ua":
          '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
      },
      data: data,
    };
    const response = await axios.post(
      "https://adminapi.bestlive.io/api/bank-account/request",
      data,
      config
    );
    if (response.status !== 200) {
      throw new Error("Request failed with status: " + response.status);
    } else if (typeof response.data === "object" && response.data !== null) {
      // Data is an object
      const requestData = response.data.data;
      // console.log(requestData);

      // Iterate over the extractedData
      extractedData.forEach((data) => {
        const { UTR_Number, Credit_Amount } = data;

        // Find matching data in requestData
        const matchingData = Object.values(requestData).filter(
          (item) =>
            item.utr_number === UTR_Number || item.amount === Credit_Amount
        );
        // console.log(matchingData);

        if (matchingData.length > 0) {
          // Matching entries found
          matchingData.forEach((item) => {
            const { id, user_id, utr_number, amount } = item;
            // console.log(id, user_id, utr_number, amount);
            console.log(`UTR Number: ${utr_number} Amount: ${amount}`);
            // accept requests
            acceptRequests(id, user_id, utr_number, amount, token);
          });
        }
      });
    } else {
      throw new Error("Invalid response data format");
    }
  } catch (error) {
    // Handle any errors
    console.error(error);
  }
};
// accept requests
const acceptRequests = async (id, user_id, utr_number, amount, token) => {
  try {
    // let token = await login();
    let data = JSON.stringify({
      uid: user_id,
      balance: amount,
      withdraw_req_id: id,
      remark: "sat",
    });
    let config = {
      method: "post",
      maxBodyLength: Infinity,
      headers: {
        authority: "adminapi.bestlive.io",
        accept: "application/json, text/plain, */*",
        "accept-language": "en-IN,en;q=0.9,mr;q=0.8,lb;q=0.7",
        authorization: `Bearer ${token}`,
        "cache-control": "no-cache, no-store",
        "content-type": "application/json",
        encryption: "false",
        origin: "https://admin.dafaexch9.com",
        referer: "https://admin.dafaexch9.com/",
        "sec-ch-ua":
          '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
      },
      data: data,
    };
    const response = await axios.post(
      "https://adminapi.bestlive.io/api/app-user/action/deposit-balance",
      data,
      config
    );
    if (response.status !== 200) {
      throw new Error("Request failed with status: " + response.status);
    } else if (response.data.status === 1) {
      console.log(response.data);
      // processUTRNumber(utrNumber, amount);
    } else {
      throw new Error("Invalid response data format");
    }
  } catch (error) {
    // Handle any errors
    console.error(error);
  }
};

getRequests(extractedData);

// setInterval(getRequests(extractedData), 60000);

// Start the server
app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
