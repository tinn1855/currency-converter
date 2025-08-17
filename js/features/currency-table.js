import { getCurrencies } from "../services/currencies.service.js";

class CurrencyTable {
  #PAGINATION = 20;

  #sourceData = [];
  #tableContent;
  #tablePagination;

  #paginationData = {
    page: 1,
    totalPages: 1,
    data: [],
  };

  constructor(id) {
    this.#tableContent = document.querySelector(`#${id} tbody`);
    this.#tablePagination = document.querySelector(`#${id} .pagination`);

    this.init();
    this.bindEvents();
  }

  async init() {
    await this.fetchData();
    this.initPagination(this.#sourceData);
    this.renderData();
    this.renderPagination();
  }

  bindEvents() {
    this.bindRefreshButtonEvent();
    this.bindPaginationEvents();
    this.bindFilterEvents();
  }

  bindRefreshButtonEvent() {
    const refreshButton = document.querySelector(".refresh");
    if (refreshButton) {
      refreshButton.addEventListener("click", () => this.refreshData());
    }
  }

  bindPaginationEvents() {
    this.#tablePagination.addEventListener("click", (event) => {
      const target = event.target;
      if (target.tagName === "BUTTON") {
        const page = Number(target.dataset.page);
        if (page !== this.#paginationData.page) {
          this.#paginationData.page = page;
          this.#paginationData.data = this.#sourceData.slice(
            (page - 1) * this.#PAGINATION,
            page * this.#PAGINATION
          );
          this.renderData();
          this.renderPagination();
        }
      }
    });
  }

  bindFilterEvents() {
    const searchInput = document.querySelector(".search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const search = e.target.value.trim();

        this.initPagination(
          this.#sourceData.filter((currency) =>
            currency.name.toLowerCase().includes(search)
          )
        );
        this.renderData();
        this.renderPagination();
      });
    }
  }

  async fetchData() {
    try {
      const response = await getCurrencies();
      this.#sourceData = Object.entries(response.conversion_rates).map(
        ([code, rate]) => ({
          code,
          rate,
          name: code,
        })
      );

      const currencyNames = await getCurrencyNamesByCodes(
        this.#sourceData.map((currency) => currency.code)
      );

      this.#sourceData = this.#sourceData.map((currency) => ({
        ...currency,
        name: currencyNames[currency.code] || currency.name,
      }));
    } catch (error) {
      console.error("Error fetching currencies:", error);
    }
  }

  refreshData() {
    this.init();
  }

  initPagination(sourceData) {
    const totalPages = Math.ceil(sourceData.length / this.#PAGINATION);
    this.#paginationData = {
      page: 1,
      totalPages,
      data: sourceData.slice(0, this.#PAGINATION),
    };
  }

  renderData() {
    this.#tableContent.innerHTML = this.#paginationData.data
      .map(
        (currency, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${currency.name}</td>
        <td>${currency.code}</td>
        <td>${currency.rate}</td>
        <td>${currency.rate}</td>
        <td>${currency.rate}</td>
      </tr>
    `
      )
      .join("");
  }

  renderPagination() {
    const currentPage = this.#paginationData.page;
    const totalPages = this.#paginationData.totalPages;

    // Calculate the range of pages to show (3 pages with current page in the middle)
    let startPage, endPage;

    if (totalPages <= 3) {
      // If total pages is 3 or less, show all pages
      startPage = 1;
      endPage = totalPages;
    } else {
      // Show 3 pages with current page in the middle when possible
      if (currentPage === 1) {
        startPage = 1;
        endPage = 3;
      } else if (currentPage === totalPages) {
        startPage = totalPages - 2;
        endPage = totalPages;
      } else {
        startPage = currentPage - 1;
        endPage = currentPage + 1;
      }
    }

    // Build pagination HTML
    let paginationHTML = "";

    // First button
    paginationHTML += `<button class="btn" data-page="1" ${
      currentPage === 1 ? "disabled" : ""
    }>First</button>`;

    // Previous button
    paginationHTML += `<button class="btn" data-page="${currentPage - 1}" ${
      currentPage === 1 ? "disabled" : ""
    }>Prev</button>`;

    // Show ellipsis if there are pages before the visible range
    if (startPage > 1) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `<button class="btn ${
        i === currentPage ? "btn-primary" : ""
      }" data-page="${i}">${i}</button>`;
    }

    // Show ellipsis if there are pages after the visible range
    if (endPage < totalPages) {
      paginationHTML += `<span class="pagination-ellipsis">...</span>`;
    }

    // Next button
    paginationHTML += `<button class="btn" data-page="${currentPage + 1}" ${
      currentPage === totalPages ? "disabled" : ""
    }>Next</button>`;

    // Last button
    paginationHTML += `<button class="btn" data-page="${totalPages}" ${
      currentPage === totalPages ? "disabled" : ""
    }>Last</button>`;

    this.#tablePagination.innerHTML = paginationHTML;
  }
}

export { CurrencyTable };
