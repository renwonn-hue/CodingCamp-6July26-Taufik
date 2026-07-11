// ============================================
// EXPENSE & BUDGET VISUALIZER - MAIN SCRIPT
// ============================================

// DOM Elements
const expenseForm = document.getElementById('expenseForm');
const itemNameInput = document.getElementById('itemName');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const transactionList = document.getElementById('transactionList');
const totalBalanceDisplay = document.getElementById('totalBalance');
const categorySummary = document.getElementById('categorySummary');
const themeBtn = document.getElementById('themeBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');

// Data Storage
let expenses = [];
let chartInstance = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    loadExpenses();
    console.log('Expenses loaded:', expenses);
    initTheme();
    updateUI();
    initChart();
    setupEventListeners();
    console.log('All initialized successfully');
});

// ============================================
// EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
    expenseForm.addEventListener('submit', handleAddExpense);
    clearBtn.addEventListener('click', handleClearAll);
    exportBtn.addEventListener('click', handleExportData);
}

// ============================================
// THEME MANAGEMENT
// ============================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        themeBtn.textContent = '☀️ Light Mode';
    } else {
        document.body.classList.remove('dark-mode');
        themeBtn.textContent = '🌙 Dark Mode';
    }
    localStorage.setItem('theme', theme);
}

themeBtn.addEventListener('click', () => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
});

// ============================================
// EXPENSE OPERATIONS
// ============================================

function handleAddExpense(e) {
    e.preventDefault();
    console.log('Add expense clicked');

    const itemName = itemNameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;

    console.log('Form values:', { itemName, amount, category });

    // Validation
    if (!itemName || !amount || !category) {
        console.warn('Validation failed: missing fields');
        showNotification('⚠️ Mohon isi semua field dengan benar!', 'warning');
        return;
    }

    if (amount <= 0) {
        console.warn('Validation failed: amount is 0 or negative');
        showNotification('⚠️ Jumlah harus lebih dari 0!', 'warning');
        return;
    }

    // Create expense object
    const expense = {
        id: Date.now(),
        name: itemName,
        amount: amount,
        category: category,
        date: new Date().toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    };

    console.log('Expense created:', expense);

    // Add to expenses array
    expenses.push(expense);
    console.log('Expenses array:', expenses);
    
    saveExpenses();
    console.log('Expenses saved to localStorage');
    
    updateUI();
    console.log('UI updated');

    // Clear form and show success
    expenseForm.reset();
    itemNameInput.focus();
    showNotification('✅ Pengeluaran berhasil ditambahkan!', 'success');
}

function deleteExpense(id) {
    expenses = expenses.filter(exp => exp.id !== id);
    saveExpenses();
    updateUI();
    showNotification('🗑️ Pengeluaran berhasil dihapus!', 'info');
}

function handleClearAll() {
    if (expenses.length === 0) {
        showNotification('⚠️ Tidak ada data untuk dihapus!', 'warning');
        return;
    }

    if (confirm('⚠️ Apakah Anda yakin ingin menghapus SEMUA pengeluaran? Tindakan ini tidak dapat dibatalkan!')) {
        expenses = [];
        saveExpenses();
        updateUI();
        showNotification('🗑️ Semua data berhasil dihapus!', 'success');
    }
}

function handleExportData() {
    if (expenses.length === 0) {
        showNotification('⚠️ Tidak ada data untuk diekspor!', 'warning');
        return;
    }

    const csvContent = generateCSV();
    downloadFile(csvContent, 'expense-tracker.csv', 'text/csv');
    showNotification('📥 Data berhasil diekspor!', 'success');
}

// ============================================
// LOCAL STORAGE
// ============================================

function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

function loadExpenses() {
    const stored = localStorage.getItem('expenses');
    expenses = stored ? JSON.parse(stored) : [];
}

// ============================================
// UI UPDATES
// ============================================

function updateUI() {
    updateBalance();
    renderTransactionList();
    updateCategorySummary();
    updateChart();
}

function updateBalance() {
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    totalBalanceDisplay.textContent = formatCurrency(total);
}

function renderTransactionList() {
    if (expenses.length === 0) {
        transactionList.innerHTML = `
            <div class="empty-state">
                <p>📭 Belum ada transaksi. Mulai tambahkan sekarang!</p>
            </div>
        `;
        return;
    }

    transactionList.innerHTML = expenses
        .sort((a, b) => b.id - a.id)
        .map(exp => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-name">${escapeHtml(exp.name)}</div>
                    <div class="transaction-category category-${exp.category}">
                        ${getCategoryIcon(exp.category)} ${getCategoryLabel(exp.category)}
                    </div>
                </div>
                <div class="transaction-amount">-${formatCurrency(exp.amount)}</div>
                <button class="btn-delete" onclick="deleteExpense(${exp.id})">Hapus</button>
            </div>
        `)
        .join('');
}

function updateCategorySummary() {
    const summary = calculateCategorySummary();

    if (Object.keys(summary).length === 0) {
        categorySummary.innerHTML = `
            <div class="empty-state">
                <p>📊 Belum ada data kategori</p>
            </div>
        `;
        return;
    }

    const total = Object.values(summary).reduce((a, b) => a + b, 0);

    categorySummary.innerHTML = Object.entries(summary)
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => {
            const percentage = ((amount / total) * 100).toFixed(1);
            return `
                <div class="summary-item category-${category}">
                    <div class="summary-item-name">
                        ${getCategoryIcon(category)} ${getCategoryLabel(category)} <small>(${percentage}%)</small>
                    </div>
                    <div class="summary-item-amount">${formatCurrency(amount)}</div>
                </div>
            `;
        })
        .join('');
}

function calculateCategorySummary() {
    return expenses.reduce((summary, exp) => {
        summary[exp.category] = (summary[exp.category] || 0) + exp.amount;
        return summary;
    }, {});
}

// ============================================
// CHART MANAGEMENT
// ============================================

function initChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#f6ad55',
                    '#4299e1',
                    '#ed64a6',
                    '#48bb78',
                    '#667eea'
                ],
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary'),
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                        font: {
                            size: 12,
                            weight: 500
                        },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateChart() {
    const summary = calculateCategorySummary();

    if (Object.keys(summary).length === 0) {
        chartInstance.data.labels = [];
        chartInstance.data.datasets[0].data = [];
        chartInstance.update();
        return;
    }

    const labels = Object.keys(summary).map(cat => getCategoryLabel(cat));
    const data = Object.values(summary);

    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.update();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function getCategoryLabel(category) {
    const labels = {
        'Food': 'Makanan',
        'Transport': 'Transportasi',
        'Fun': 'Hiburan',
        'Health': 'Kesehatan',
        'Other': 'Lainnya'
    };
    return labels[category] || category;
}

function getCategoryIcon(category) {
    const icons = {
        'Food': '🍔',
        'Transport': '🚗',
        'Fun': '🎮',
        'Health': '🏥',
        'Other': '📌'
    };
    return icons[category] || '📌';
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 14px 20px;
        background-color: ${type === 'success' ? '#48bb78' : type === 'warning' ? '#ed8936' : '#4299e1'};
        color: white;
        border-radius: 8px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function generateCSV() {
    let csv = 'Nama,Jumlah,Kategori,Tanggal\n';
    
    expenses.forEach(exp => {
        csv += `"${exp.name}",${exp.amount},"${getCategoryLabel(exp.category)}","${exp.date}"\n`;
    });

    // Add summary
    csv += '\n\nRingkasan Kategori:\n';
    const summary = calculateCategorySummary();
    Object.entries(summary).forEach(([category, amount]) => {
        csv += `"${getCategoryLabel(category)}",${amount}\n`;
    });

    // Add total
    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    csv += `\nTotal,${total}\n`;

    return csv;
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// ============================================
// ANIMATION KEYFRAMES
// ============================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ============================================
// END OF SCRIPT
// ============================================
