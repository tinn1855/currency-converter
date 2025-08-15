import { API_URL, KEY } from "./config.js";

const fromValue = document.getElementById("fromValue");
const toValue = document.getElementById("toValue");
const amountValue = document.getElementById("amount");
const tableBody = document.querySelector(".table-currency tbody");
const convertedResult = document.getElementById("converted-result");

let currencyRate = {};

// Lấy dữ liệu tỷ giá
const fetchCurrency = async (baseCurrency = "USD") => {
  try {
    const res = await fetch(`${API_URL}/${KEY}/latest/${baseCurrency}`);
    const data = await res.json();

    if (data.result !== "success") {
      throw new Error(data["error-type"] || "Unknown API error");
    }
    currencyRate = data.conversion_rates;
    renderCurrencyTable();
    renderOptionSelect();
  } catch (error) {
    console.error("Error fetching currency data:", error);
  }
};

// Định dạng tiền tệ
const formatCurrency = (value) =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// So sánh và đổi tiền
const compareCurrencies = async (from, to, amount) => {
  if (!amount || isNaN(amount)) return;
  try {
    const res = await fetch(`${API_URL}/${KEY}/pair/${from}/${to}/${amount}`);
    const data = await res.json();
    if (data.result !== "success") {
      throw new Error(data["error-type"] || "API conversion error");
    }
    convertedResult.innerHTML = `
      <h3>${formatCurrency(amount)} ${from} = <span>${formatCurrency(
      data.conversion_result
    )} ${to}</span></h3>
      <p>Tỷ giá: 1 ${from} = ${formatCurrency(data.conversion_rate)} ${to}</p>
    `;
  } catch (error) {
    console.error("Error comparing currencies:", error);
  }
};

// Render select option
const renderOptionSelect = () => {
  fromValue.innerHTML = "";
  toValue.innerHTML = "";

  Object.keys(currencyRate).forEach((currency) => {
    const option = document.createElement("option");
    option.value = currency;
    option.textContent = currency;
    fromValue.appendChild(option);
    toValue.appendChild(option.cloneNode(true));
  });

  fromValue.value = "USD";
  toValue.value = "VND";
};

// Render bảng tiền tệ (không phân trang)
const renderCurrencyTable = () => {
  tableBody.innerHTML = "";
  const entries = Object.entries(currencyRate);

  entries.forEach(([code, rate], index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${code}</td>
      <td>-</td>
      <td>-</td>
      <td>${rate}</td>
      <td>-</td>
    `;
    tableBody.appendChild(row);
  });
};

// Debounce
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

// Sự kiện DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  fetchCurrency("USD");
  compareCurrencies("USD", "VND", 1);

  amountValue.addEventListener(
    "input",
    debounce(() => {
      compareCurrencies(fromValue.value, toValue.value, amountValue.value);
    }, 1000)
  );

  [fromValue, toValue].forEach((el) =>
    el.addEventListener(
      "change",
      debounce(() => {
        compareCurrencies(fromValue.value, toValue.value, amountValue.value);
      }, 500)
    )
  );
});
