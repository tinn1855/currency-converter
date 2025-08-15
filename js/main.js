import { API_URL, KEY } from "./config.js";
import { FLAG_CURRENCY } from "../mockAPI/flag.js";
import { CURRENCY_NAME } from "../mockAPI/currency-name.js";

const fromValue = document.getElementById("fromValue");
const toValue = document.getElementById("toValue");
const amountValue = document.getElementById("amount");
const tableBody = document.querySelector(".table-currency tbody");
const convertedResult = document.getElementById("converted-result");

let currencyRate = {};

let currentPage = 1;
const rowsPerPage = 20;

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
    renderPagination();
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

function getPageData() {
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  return Object.entries(currencyRate).slice(start, end);
}

// render pagination
function renderPagination() {
  const paginationEl = document.getElementById("pagination");
  paginationEl.innerHTML = "";
  const totalPages = Math.ceil(Object.keys(currencyRate).length / rowsPerPage);

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Previous";
  prevBtn.classList.add("btn");
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", () => {
    goToPage(currentPage - 1, totalPages);
  });
  paginationEl.appendChild(prevBtn);

  const addPageButton = (page) => {
    const btn = document.createElement("button");
    btn.textContent = page;
    btn.classList.add("btn");
    if (page === currentPage) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => {
      goToPage(page, totalPages);
    });
    paginationEl.appendChild(btn);
  };

  addPageButton(1);

  if (currentPage > 3) {
    const dots = document.createElement("span");
    dots.textContent = "...";
    paginationEl.appendChild(dots);
  }

  let startPage = Math.max(2, currentPage - 1);
  let endPage = Math.min(totalPages - 1, currentPage + 1);

  for (let i = startPage; i <= endPage; i++) {
    addPageButton(i);
  }

  if (currentPage < totalPages - 2) {
    const dots = document.createElement("span");
    dots.textContent = "...";
    paginationEl.appendChild(dots);
  }

  if (totalPages > 1) {
    addPageButton(totalPages);
  }

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.classList.add("btn");
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener("click", () => {
    goToPage(currentPage + 1, totalPages);
  });
  paginationEl.appendChild(nextBtn);
}

const goToPage = (page, totalPages) => {
  if (page < 1 || page > totalPages) return;
  currentPage = page;

  const pageParam = new URL(window.location);
  // pageParam.searchParams.set("page", page);
  if (currentPage === 1) {
    pageParam.searchParams.delete("page");
  } else {
    pageParam.searchParams.set("page", currentPage);
  }
  window.history.pushState({}, "", pageParam);
  renderCurrencyTable();
  renderPagination();
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
  const entries = getPageData();

  entries.forEach(([code, rate], index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>  ${code}</td>
      <td> <img src="${
        FLAG_CURRENCY[code.toLowerCase()]
      }" alt="${code} flag" width="24" /> ${CURRENCY_NAME[code]}</td>
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
  const params = new URLSearchParams(window.location.search);
  const pageFromURL = parseInt(params.get("page"));
  if (!isNaN(pageFromURL) && pageFromURL > 0) {
    currentPage = pageFromURL;
  }
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
