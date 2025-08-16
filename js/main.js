import { API_URL, KEY } from "./config.js";
import { FLAG_CURRENCY } from "../mockAPI/flag.js";
import { CURRENCY_NAME } from "../mockAPI/currency-name.js";

const fromValue = document.getElementById("fromValue");
const toValue = document.getElementById("toValue");
const amountValue = document.getElementById("amount");
const tableBody = document.querySelector(".table-currency tbody");
const convertedResult = document.getElementById("converted-result");

let currencyRate = {};
let filteredCurrency = null; // null = no filter, {} = empty results, object = filtered data
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

    // If there's an active search, re-apply it with new currency data but preserve page
    const searchInput = document.getElementById("search-input");
    if (searchInput && searchInput.value.trim()) {
      searchCurrency(searchInput.value, false); // Don't reset page
    } else {
      renderCurrencyTable();
      renderPagination();
    }

    renderOptionSelect(preserveSelectValues);
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

  // If no filter applied, use all currency data
  if (filteredCurrency === null) {
    return Object.entries(currencyRate).slice(start, end);
  }

  // If filter applied, use filtered data (could be empty object)
  return Object.entries(filteredCurrency).slice(start, end);
}

// Helper function to validate and adjust current page
const validateCurrentPage = () => {
  let totalItems;
  if (filteredCurrency === null) {
    totalItems = Object.keys(currencyRate).length;
  } else {
    totalItems = Object.keys(filteredCurrency).length;
  }

  const totalPages = Math.ceil(totalItems / rowsPerPage);

  // If current page exceeds total pages, adjust to last page
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = totalPages;
  } else if (currentPage < 1) {
    currentPage = 1;
  }
};

// Update URL with current page and search params
const updateUrl = (searchTerm = null) => {
  const url = new URL(window.location);

  // Update page parameter
  if (currentPage === 1) {
    url.searchParams.delete("page");
  } else {
    url.searchParams.set("page", currentPage);
  }

  // Update search parameter
  if (searchTerm && searchTerm.trim()) {
    url.searchParams.set("search", encodeURIComponent(searchTerm.trim()));
  } else {
    url.searchParams.delete("search");
  }

  window.history.pushState({}, "", url);
};

const searchCurrency = debounce((keyword, resetPage = true) => {
  const searchTerm = keyword.trim().toLowerCase();
  const originalKeyword = keyword.trim(); // Keep original for URL

  console.log("searchCurrency called:", { keyword, resetPage, currentPage });

  if (!searchTerm) {
    // Clear filter
    filteredCurrency = null;
    if (resetPage) {
      currentPage = 1;
      updateUrl(); // Clear search param from URL
    }
    renderCurrencyTable();
    renderPagination();
    return;
  }

  // Apply filter
  filteredCurrency = Object.fromEntries(
    Object.entries(currencyRate).filter(([code]) => {
      const name = CURRENCY_NAME[code] || "";
      return (
        code.toLowerCase().includes(searchTerm) ||
        name.toLowerCase().includes(searchTerm)
      );
    })
  );

  // Reset to first page only if resetPage is true
  if (resetPage) {
    currentPage = 1;
  } else {
    // Validate current page doesn't exceed available pages
    validateCurrentPage();
  }
  updateUrl(originalKeyword);

  // Check if no results found
  if (Object.keys(filteredCurrency).length === 0) {
    tableBody.innerHTML = "<tr><td colspan='6'>No results found</td></tr>";
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  renderCurrencyTable();
  renderPagination();
}, 300);

// render pagination
function renderPagination() {
  const paginationEl = document.getElementById("pagination");
  paginationEl.innerHTML = "";

  // Calculate total items based on current state
  let totalItems;
  if (filteredCurrency === null) {
    // No filter applied
    totalItems = Object.keys(currencyRate).length;
  } else {
    // Filter applied
    totalItems = Object.keys(filteredCurrency).length;
  }

  const totalPages = Math.ceil(totalItems / rowsPerPage);

  // Don't show pagination if no items or only one page
  if (totalItems === 0 || totalPages <= 1) {
    return;
  }

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

  // Get current search term to preserve in URL
  const searchInput = document.getElementById("search-input");
  const currentSearch = searchInput ? searchInput.value.trim() : "";
  updateUrl(currentSearch);

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
      <td class="currency-flag"><img src="${
        FLAG_CURRENCY[code.toLowerCase()]
      }" alt="${code} flag" width="24"  onerror="this.src='images/no-flag.png'"  /> ${
      CURRENCY_NAME[code] || code
    }</td>
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
  const searchFromURL = params.get("search");

  // Set current page from URL
  if (!isNaN(pageFromURL) && pageFromURL > 0) {
    currentPage = pageFromURL;
  } else {
    currentPage = 1;
  }

  // Initialize currency data
  fetchCurrency("USD");
  compareCurrencies("USD", "VND", 1);

  // Restore search from URL if exists
  const searchInput = document.getElementById("search-input");
  if (searchFromURL && searchInput) {
    const decodedSearch = decodeURIComponent(searchFromURL);
    searchInput.value = decodedSearch;

    // Trigger search after currency data is loaded but preserve current page
    setTimeout(() => {
      searchCurrency(decodedSearch, false); // Don't reset page
    }, 500); // Wait for fetchCurrency to complete
  }

  document.getElementById("search-input").addEventListener("input", (e) => {
    searchCurrency(e.target.value, true); // Reset page when user types
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
