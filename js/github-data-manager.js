class GitHubDataManager {
  constructor(username, repo, filepath, token) {
    this.username = username;
    this.repo = repo;
    this.filepath = filepath;
    this.token = token;
    // Fixed: Use template literals with the constructor parameters
    this.apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/${filepath}`;
    this.rawUrl = `https://raw.githubusercontent.com/${username}/${repo}/main/${filepath}`;
  }

  // Read CSV data from GitHub
  async loadData() {
    try {
      const response = await fetch(this.rawUrl);
      const csvText = await response.text();
      return this.parseCSV(csvText);
    } catch (error) {
      console.error('Error loading data:', error);
      return [];
    }
  }

  // Save CSV data to GitHub
  async saveData(data) {
    try {
      // First, get the current file's SHA (required for updates)
      const fileInfo = await fetch(this.apiUrl, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      let sha = null;
      if (fileInfo.ok) {
        const fileData = await fileInfo.json();
        sha = fileData.sha;
      }

      // Convert data back to CSV
      const csvContent = this.dataToCSV(data);
      
      // Update the file
      const response = await fetch(this.apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update travel budget - ${new Date().toISOString()}`,
          content: btoa(csvContent), // Base64 encode
          sha: sha // Include SHA if file exists
        })
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      return false;
    }
  }

  // Parse CSV text to array of objects
  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    // Extract headers
    const headers = this.parseCSVLine(lines[0]);
    
    // Parse data rows
    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
  }

  // Parse a single CSV line (handles quoted fields)
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // Convert data array back to CSV
  dataToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvLines = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        let value = row[header] || '';
        // Quote values that contain commas or quotes
        if (value.includes(',') || value.includes('"')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvLines.push(values.join(','));
    });
    
    return csvLines.join('\n');
  }

  // Add a new expense
  async addExpense(description, category, amountEUR, amountUSD, payer, danAmount, tienAmount) {
    const data = await this.loadData();
    
    const newExpense = {
      'Date': new Date().toLocaleString(),
      'Description': description,
      'Category': category,
      'Amount (EUR)': amountEUR,
      'Amount (USD)': amountUSD,
      'Payer': payer,
      'Dan Amount (EUR)': danAmount,
      'Tien Amount (EUR)': tienAmount
    };
    
    data.push(newExpense);
    return await this.saveData(data);
  }
}

// Usage example - Replace with your actual values
const dataManager = new GitHubDataManager(
  'dansklee',                       // Your GitHub username
  'travel_budget_tracker',          // Your repo name
  'data/budget_data.csv',         // Path to CSV file in repo
  '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'      // Your GitHub token (replace this!)
);

// Example usage functions
async function loadExpenses() {
  const expenses = await dataManager.loadData();
  console.log('Loaded expenses:', expenses);
  return expenses;
}

async function addNewExpense() {
  const success = await dataManager.addExpense(
    'Dinner at restaurant',  // description
    'Food',                 // category
    25.50,                  // amount EUR
    29.84,                  // amount USD
    'Dan',                  // payer
    25.50,                  // Dan amount
    0.00                    // Tien amount
  );
  
  if (success) {
    console.log('Expense added successfully!');
  } else {
    console.log('Failed to add expense');
  }
}

// Initialize your app
async function initApp() {
  try {
    const expenses = await loadExpenses();
    // Update your UI with the loaded expenses
    displayExpenses(expenses);
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Call this when your page loads
// initApp();
