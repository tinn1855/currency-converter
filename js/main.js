import { API_URL, KEY } from "./config.js";
import { FLAG_CURRENCY } from "../mockAPI/flag.js";
import { CURRENCY_NAME } from "../mockAPI/currency-name.js";

const fromValue = document.getElementById("fromValue");
const toValue = document.getElementById("toValue");
const amountValue = document.getElementById("amount");
const tableBody = document.querySelector(".table-currency tbody");
const convertedResult = document.getElementById("converted-result");

let currencyRate = {};
let filteredCurrency = {};
let currentPage = 1;
const rowsPerPage = 20;

const fetchCurrency = async (
  baseCurrency = "USD",
  preserveSelectValues = false
) => {
  try {
    const res = await fetch(`${API_URL}/${KEY}/latest/${baseCurrency}`);
    const data = await res.json();

    if (data.result !== "success") {
      throw new Error(data["error-type"] || "Unknown API error");
    }
    currencyRate = data.conversion_rates;
    renderCurrencyTable();
    renderOptionSelect(preserveSelectValues);
    renderPagination();
  } catch (error) {
    console.error("Error fetching currency data:", error);
  }
};

// Debounce
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

// Định dạng tiền tệ
const formatCurrency = (value, options = {}) => {
  if (value === null || value === undefined || value === "") {
    return "0.00";
  }

  const numValue = Number(value);

  if (isNaN(numValue)) {
    return "0.00";
  }

  const defaultOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6, // Tăng lên để hiển thị tỷ giá chính xác hơn
    ...options,
  };

  if (Math.abs(numValue) < 0.01 && numValue !== 0) {
    return numValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
      ...options,
    });
  }

  if (Math.abs(numValue) >= 1000000) {
    return numValue.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    });
  }

  return numValue.toLocaleString("en-US", defaultOptions);
};

// Định dạng tỷ giá - tối ưu cho hiển thị exchange rate
const formatExchangeRate = (value) => {
  if (value === null || value === undefined || value === "") {
    return "0.00";
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return "0.00";
  }

  // Số rất nhỏ: hiển thị nhiều chữ số
  if (numValue < 0.001) {
    return numValue.toLocaleString("en-US", {
      minimumFractionDigits: 6,
      maximumFractionDigits: 8,
    });
  }

  // Số nhỏ: hiển thị 4-6 chữ số
  if (numValue < 1) {
    return numValue.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    });
  }

  // Số bình thường: 2-4 chữ số
  return numValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
};

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
      <p>Tỷ giá: 1 ${from} = ${formatExchangeRate(
      data.conversion_rate
    )} ${to}</p>
    `;
  } catch (error) {
    console.error("Error comparing currencies:", error);
  }
};

const swapCurrencies = () => {
  const fromCurrency = fromValue.value;
  const toCurrency = toValue.value;

  // Check if both currencies are selected
  if (!fromCurrency || !toCurrency) {
    console.warn("Both currencies must be selected to swap");
    return;
  }

  // Check if they are the same
  if (fromCurrency === toCurrency) {
    console.warn("Cannot swap identical currencies");
    return;
  }

  // Add visual feedback
  const swapBtn = document.getElementById("swapBtn");
  swapBtn.style.transform = "rotate(180deg)";

  // Swap the values
  fromValue.value = toCurrency;
  toValue.value = fromCurrency;

  // Reset button rotation after a short delay
  setTimeout(() => {
    swapBtn.style.transform = "";
  }, 300);

  // Update the conversion with current amount - this will handle the new currency pair
  const currentAmount = amountValue.value || 1;
  compareCurrencies(fromValue.value, toValue.value, currentAmount);
};

function getPageData() {
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const data = Object.entries(filteredCurrency).length
    ? Object.entries(filteredCurrency)
    : Object.entries(currencyRate);
  return data.slice(start, end);
}

const searchCurrency = debounce((keyword) => {
  const searchTerm = keyword.trim().toLowerCase();
  if (!searchTerm) {
    filteredCurrency = {};
  } else {
    filteredCurrency = Object.fromEntries(
      Object.entries(currencyRate).filter(([code]) => {
        const name = CURRENCY_NAME[code] || "";
        return (
          code.toLowerCase().includes(searchTerm) ||
          name.toLowerCase().includes(searchTerm)
        );
      })
    );
  }

  // Check if search term exists but no results found
  if (searchTerm && Object.keys(filteredCurrency).length === 0) {
    tableBody.innerHTML = "<tr><td colspan='6'>No results found</td></tr>";
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  currentPage = 1;
  renderCurrencyTable();
  renderPagination();
}, 300);

// render pagination
function renderPagination() {
  const paginationEl = document.getElementById("pagination");
  paginationEl.innerHTML = "";

  const totalItems = Object.entries(filteredCurrency).length
    ? Object.entries(filteredCurrency).length
    : Object.keys(currencyRate).length;

  const totalPages = Math.ceil(totalItems / rowsPerPage);

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
const renderOptionSelect = (preserveValues = false) => {
  // Lưu giá trị hiện tại nếu cần preserve
  const currentFromValue = preserveValues ? fromValue.value : null;
  const currentToValue = preserveValues ? toValue.value : null;

  fromValue.innerHTML = "";
  toValue.innerHTML = "";

  Object.keys(currencyRate).forEach((currency) => {
    const option = document.createElement("option");
    option.value = currency;
    option.textContent = currency;
    fromValue.appendChild(option);
    toValue.appendChild(option.cloneNode(true));
  });

  // Khôi phục giá trị cũ hoặc set mặc định
  if (preserveValues && currentFromValue && currentToValue) {
    fromValue.value = currentFromValue;
    toValue.value = currentToValue;
  } else {
    fromValue.value = "USD";
    toValue.value = "VND";
  }
};

// Render bảng tiền tệ
const renderCurrencyTable = () => {
  tableBody.innerHTML = "";

  getPageData().forEach(([code, rate], index) => {
    const row = document.createElement("tr");
    // Calculate correct index based on current page
    const actualIndex = (currentPage - 1) * rowsPerPage + index + 1;

    row.innerHTML = `
      <td>${actualIndex}</td>
      <td>${code}</td>
      <td><img src="${
        FLAG_CURRENCY[code.toLowerCase()]
      }" alt="${code} flag" width="24" /> ${CURRENCY_NAME[code] || code}</td>
      <td>-</td>
      <td>${formatExchangeRate(rate)}</td>
      <td>-</td>
    `;
    tableBody.appendChild(row);
  });
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

  document.getElementById("search-input").addEventListener("input", (e) => {
    searchCurrency(e.target.value);
  });

  document.getElementById("swapBtn").addEventListener("click", (e) => {
    e.preventDefault();
    swapCurrencies();
  });

  amountValue.addEventListener(
    "input",
    debounce(() => {
      compareCurrencies(fromValue.value, toValue.value, amountValue.value);
    }, 1000)
  );

  fromValue.addEventListener(
    "change",
    debounce(() => {
      fetchCurrency(fromValue.value, true);
      compareCurrencies(fromValue.value, toValue.value, amountValue.value);
    }, 500)
  );

  toValue.addEventListener(
    "change",
    debounce(() => {
      compareCurrencies(fromValue.value, toValue.value, amountValue.value);
    }, 500)
  );
});
