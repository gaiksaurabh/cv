//
// --- IMPORTANT: PASTE YOUR GOOGLE APPS SCRIPT URL HERE ---
//
const SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_URL_HERE";
//
// -------------------------------------------------------------
//

document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("entry-form");
    const submitButton = document.getElementById("submit-button");
    const dateInput = document.getElementById("date");
    const costInputs = document.querySelectorAll(".cost-input");
    const receivedInput = document.getElementById("received");
    const totalAmountInput = document.getElementById("total-amount");
    const balanceInput = document.getElementById("bal-amt");
    const fetchButton = document.getElementById("fetch-button");
    const downloadPdfButton = document.getElementById("download-pdf-button");
    const resultsContainer = document.getElementById("results-table");
    const loadingMessage = document.getElementById("loading-message");
    let currentCustomerData = null;

    function setInitialDate() {
        const storedDate = localStorage.getItem('persistentDate');
        dateInput.value = storedDate ? storedDate : new Date().toISOString().split('T')[0];
    }

    async function fetchDropdowns() {
        try {
            const response = await fetch(`${SCRIPT_URL}?action=getDropdowns`);
            const options = await response.json();
            populateDatalists(options);
        } catch (error) {
            console.error('Error fetching dropdowns:', error);
            alert('Could not load initial data. Please check the console.');
        }
    }
    
    function populateDatalists(options) {
        const populate = (listId, values) => {
            const datalist = document.getElementById(listId);
            if (!datalist || !values) return;
            datalist.innerHTML = values.map(val => `<option value="${val}"></option>`).join('');
        };
        populate('customers-list', options.customers);
        populate('job-sizes-list', options.jobSizes);
        populate('paper-types-list', options.paperTypes);
        populate('paper-by-list', options.paperBy);
        populate('lamination-sizes-list', options.laminationSizes);
        populate('envelope-sizes-list', options.envelopeSizes);
    }
    
    function calculateTotals() {
        let total = 0;
        document.querySelectorAll('#cost, #paper-cost, #lami-cost, #enve-cost').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        totalAmountInput.value = total.toFixed(2);
        const received = parseFloat(receivedInput.value) || 0;
        balanceInput.value = (total - received).toFixed(2);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
        const formData = {
            date: dateInput.value, customerName: document.getElementById("customer-name").value, jobSize: document.getElementById("job-size").value,
            paperType: document.getElementById("paper-type").value, quantity: document.getElementById("quantity").value, isFrontBack: document.getElementById("is-front-back").checked,
            jobDetails: document.getElementById("job-details").value, ctp: document.getElementById("ctp").value, paperBy: document.getElementById("paper-by").value,
            lamination: document.getElementById("lamination").value, narration: document.getElementById("narration").value, laminationSize: document.getElementById("lamination-size").value,
            envelopeSize: document.getElementById("envelope-size").value, ctpNo: document.getElementById("ctp-no").value, cost: document.getElementById("cost").value,
            paperCost: document.getElementById("paper-cost").value, lamiCost: document.getElementById("lami-cost").value, enveCost: document.getElementById("enve-cost").value,
            received: receivedInput.value, balAmt: balanceInput.value, totalAmount: totalAmountInput.value
        };
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(formData) });
            const result = await response.json();
            alert(result.message);
            if(result.status === 'success') {
                form.reset();
                setInitialDate();
                calculateTotals();
                fetchDropdowns();
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Submission failed. Check console for details.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Submit Entry";
        }
    }
    
    async function handleFetchData() {
        const customerName = document.getElementById('fetch-customer-name').value;
        if (!customerName) { alert('Please select a customer.'); return; }
        loadingMessage.style.display = 'block';
        resultsContainer.innerHTML = '';
        downloadPdfButton.disabled = true;
        try {
            const response = await fetch(`${SCRIPT_URL}?action=getCustomerData&customerName=${encodeURIComponent(customerName)}`);
            const data = await response.json();
            displayData(data);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to fetch data.');
        } finally {
            loadingMessage.style.display = 'none';
        }
    }
    
    function displayData(data) {
        if (!data || data.length < 2) {
            resultsContainer.innerHTML = '<p>No data found for this customer.</p>';
            currentCustomerData = null;
            return;
        }
        currentCustomerData = data;
        const headers = data[0];
        const rows = data.slice(1);
        let table = '<table><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
        rows.forEach(row => {
            table += '<tr>' + row.map((cell, index) => `<td>${index === 0 && cell ? new Date(cell).toLocaleDateString() : (cell || '')}</td>`).join('') + '</tr>';
        });
        table += '</tbody></table>';
        resultsContainer.innerHTML = table;
        downloadPdfButton.disabled = false;
    }

    function handleDownloadPdf() {
        if (!currentCustomerData || currentCustomerData.length < 2) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const customerName = document.getElementById('fetch-customer-name').value;
        doc.text(`Data for: ${customerName}`, 40, 40);
        doc.autoTable({
            head: [currentCustomerData[0]],
            body: currentCustomerData.slice(1).map(row => [new Date(row[0]).toLocaleDateString(), ...row.slice(1)]),
            startY: 50, theme: 'grid', headStyles: { fillColor: [26, 35, 126] }, styles: { fontSize: 7, cellPadding: 2 }
        });
        doc.save(`${customerName}_data.pdf`);
    }

    form.addEventListener("submit", handleFormSubmit);
    dateInput.addEventListener("change", () => localStorage.setItem('persistentDate', dateInput.value));
    costInputs.forEach(input => input.addEventListener("input", calculateTotals));
    fetchButton.addEventListener("click", handleFetchData);
    downloadPdfButton.addEventListener("click", handleDownloadPdf);
    
    setInitialDate();
    fetchDropdowns();
    calculateTotals();
});
