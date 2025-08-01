const pdfParse = require('pdf-parse');

class PDFParser {
  static async parseReceipt(buffer) {
    try {
      // First, try to parse as PDF
      const data = await pdfParse(buffer);
      const text = data.text;
      
      // Extract receipt information using regex patterns
      const receiptData = this.extractReceiptData(text);
      
      return {
        success: true,
        data: receiptData,
        rawText: text
      };
    } catch (error) {
      console.error('PDF parsing failed, trying as text file:', error.message);
      
      // If PDF parsing fails, try to parse as text file
      try {
        const text = buffer.toString('utf8');
        console.log('Attempting to parse as text file...');
        
        // Extract receipt information from text
        const receiptData = this.extractReceiptData(text);
        
        return {
          success: true,
          data: receiptData,
          rawText: text
        };
      } catch (textError) {
        console.error('Text parsing also failed:', textError.message);
        return {
          success: false,
          error: `PDF parsing failed: ${error.message}. Text parsing also failed: ${textError.message}`,
          rawText: ''
        };
      }
    }
  }

  static extractReceiptData(text) {
    // Check if text is empty or just whitespace
    if (!text || text.trim().length === 0) {
      console.log('Empty or invalid text content, cannot extract data');
      return {
        merchant_name: '',
        amount: 0,
        date: '',
        category: '',
        description: '',
        isValid: false
      };
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    console.log('PDF Text Content:', text);
    console.log('Lines:', lines);
    
    // If no lines found, return invalid data
    if (lines.length === 0) {
      console.log('No valid lines found in text');
      return {
        merchant_name: '',
        amount: 0,
        date: '',
        category: '',
        description: '',
        isValid: false
      };
    }

    const extractedData = {
      merchant_name: '',
      amount: 0,
      date: '',
      category: '',
      description: '',
      isValid: true
    };

    // Extract merchant name (look for common patterns)
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const line = lines[i];
      console.log(`Checking line ${i}: "${line}"`);
      
      // Look for WAL*MART specifically (real Walmart format)
      if (line.toUpperCase().includes('WAL*MART') || line.toUpperCase().includes('WAL-MART')) {
        extractedData.merchant_name = 'WALMART';
        console.log(`Found WALMART merchant: ${extractedData.merchant_name}`);
        break;
      }
      
      // Look for WALMART specifically
      if (line.toUpperCase().includes('WALMART')) {
        extractedData.merchant_name = 'WALMART';
        console.log(`Found WALMART merchant: ${extractedData.merchant_name}`);
        break;
      }
      
      // Look for Walmart variations (case-insensitive)
      if (line.toLowerCase().includes('walmart') || 
          line.toLowerCase().includes('walmart.com') ||
          line.toLowerCase().includes('walmart store') ||
          line.toLowerCase().includes('walmart supercenter')) {
        extractedData.merchant_name = 'WALMART';
        console.log(`Found WALMART merchant (variation): ${extractedData.merchant_name}`);
        break;
      }
      
      // Look for Amazon patterns
      if (line.toLowerCase().includes('amazon') || 
          line.toLowerCase().includes('amazon.com') ||
          line.toLowerCase().includes('amazon order') ||
          line.toLowerCase().includes('amazon receipt')) {
        extractedData.merchant_name = 'Amazon';
        console.log(`Found Amazon merchant: ${extractedData.merchant_name}`);
        break;
      }
      
      // Look for "Order Summary" pattern (common in Amazon receipts)
      if (line.toLowerCase().includes('order summary')) {
        // Check if this is Amazon by looking at surrounding context
        const amazonKeywords = ['amazon', 'amazon.com', 'amazon order'];
        const hasAmazonContext = amazonKeywords.some(keyword => 
          text.toLowerCase().includes(keyword)
        );
        
        if (hasAmazonContext) {
          extractedData.merchant_name = 'Amazon';
          console.log(`Found Amazon merchant from Order Summary: ${extractedData.merchant_name}`);
          break;
        } else {
          extractedData.merchant_name = 'Online Store';
          console.log(`Found generic Online Store from Order Summary: ${extractedData.merchant_name}`);
          break;
        }
      }
    }

    // If no merchant found, try to extract from other patterns
    if (!extractedData.merchant_name) {
      console.log('❌ No merchant found in first 15 lines. All lines:');
      lines.slice(0, 15).forEach((line, index) => {
        console.log(`  Line ${index}: "${line}"`);
      });
      
      // Try to find merchant in the entire text
      const textLower = text.toLowerCase();
      if (textLower.includes('walmart') || textLower.includes('wal*mart') || textLower.includes('wal-mart')) {
        extractedData.merchant_name = 'WALMART';
        console.log(`Found WALMART in full text: ${extractedData.merchant_name}`);
      } else if (textLower.includes('amazon')) {
        extractedData.merchant_name = 'Amazon';
        console.log(`Found Amazon in full text: ${extractedData.merchant_name}`);
      } else {
        extractedData.merchant_name = 'Unknown Merchant';
        console.log(`No merchant found, using: ${extractedData.merchant_name}`);
      }
    }

    // Extract amount - look for proper currency format $XX.XX
    const amounts = [];
    const amountPattern = /\$(\d+\.\d{2})/g;
    const amountMatches = text.match(amountPattern);
    console.log('Amount matches:', amountMatches);
    
    if (amountMatches) {
      amountMatches.forEach(match => {
        const amount = parseFloat(match.replace('$', ''));
        console.log(`Parsed amount: ${amount} from match: ${match}`);
        if (!isNaN(amount) && amount > 0 && amount < 10000) { // Reasonable amount range
          amounts.push(amount);
        }
      });
    }
    
    if (amounts.length > 0) {
      // Use the largest reasonable amount as the total
      const reasonableAmounts = amounts.filter(amt => amt > 0 && amt < 10000);
      if (reasonableAmounts.length > 0) {
        extractedData.amount = Math.max(...reasonableAmounts);
        console.log(`Selected amount: $${extractedData.amount} from ${reasonableAmounts.length} options`);
      }
    }

    // If no amounts found with $XX.XX format, try alternative patterns
    if (extractedData.amount === 0) {
      console.log('❌ No valid amounts found. Looking for alternative patterns...');
      
      // Look for "TOTAL" followed by amount
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toUpperCase().includes('TOTAL')) {
          console.log(`Found TOTAL line: "${line}"`);
          // Look for amount in this line or next line
          const currentLineAmount = line.match(/(\d+\.\d{2})/);
          if (currentLineAmount) {
            const amount = parseFloat(currentLineAmount[1]);
            if (amount > 0 && amount < 10000) {
              extractedData.amount = amount;
              console.log(`Found amount in TOTAL line: $${amount}`);
              break;
            }
          }
          
          // Check next line for amount
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            console.log(`Checking next line after TOTAL: "${nextLine}"`);
            const nextLineAmount = nextLine.match(/(\d+\.\d{2})/);
            if (nextLineAmount) {
              const amount = parseFloat(nextLineAmount[1]);
              if (amount > 0 && amount < 10000) {
                extractedData.amount = amount;
                console.log(`Found amount in line after TOTAL: $${amount}`);
                break;
              }
            }
          }
        }
      }
    }

    // Extract date
    const datePatterns = [
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
      /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // M/D/YY or M/D/YYYY
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        let dateStr;
        if (pattern.source.includes('YYYY')) {
          // YYYY-MM-DD format
          dateStr = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else if (match[3].length === 2) {
          // MM/DD/YY format
          const year = parseInt(match[3]) < 50 ? `20${match[3]}` : `19${match[3]}`;
          dateStr = `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
        } else {
          // MM/DD/YYYY format
          dateStr = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
        }
        
        // Validate the date
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date > new Date('2000-01-01') && date <= new Date()) {
          extractedData.date = dateStr;
          console.log(`Found date: ${extractedData.date}`);
          break;
        }
      }
    }

    // If no date found, use current date as fallback
    if (!extractedData.date) {
      extractedData.date = new Date().toISOString().split('T')[0];
      console.log(`No date found, using current date: ${extractedData.date}`);
    }

    // Determine category based on merchant and text content
    const textLower = text.toLowerCase();
    if (extractedData.merchant_name === 'WALMART') {
      extractedData.category = 'Groceries';
    } else if (extractedData.merchant_name === 'Amazon') {
      extractedData.category = 'Online Shopping';
    } else if (textLower.includes('gas') || textLower.includes('fuel') || textLower.includes('shell')) {
      extractedData.category = 'Transportation';
    } else if (textLower.includes('restaurant') || textLower.includes('food') || textLower.includes('dining')) {
      extractedData.category = 'Dining';
    } else {
      extractedData.category = 'Retail';
    }

    // Generate description
    if (extractedData.merchant_name && extractedData.amount > 0) {
      extractedData.description = `Purchase from ${extractedData.merchant_name} for $${extractedData.amount.toFixed(2)}`;
    } else {
      extractedData.description = 'Receipt processing';
    }

    console.log('Final extracted data:', extractedData);
    return extractedData;
  }

  static async parseMultipleReceipts(buffers) {
    const results = [];
    
    for (const buffer of buffers) {
      try {
        const result = await this.parseReceipt(buffer);
        results.push(result);
      } catch (error) {
        console.error('Error parsing receipt:', error);
        results.push({
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = PDFParser;