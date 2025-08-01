const Imap = require('imap');
const { simpleParser } = require('mailparser');
const PDFParser = require('../utils/pdfParser');
const { runQuery, getRow } = require('../database/database');

class EmailService {
  constructor(config) {
    this.config = {
      user: config.user || process.env.EMAIL_USER,
      password: config.password || process.env.EMAIL_PASSWORD,
      host: config.host || process.env.EMAIL_HOST || 'imap.gmail.com',
      port: config.port || process.env.EMAIL_PORT || 993,
      tls: config.tls !== false,
      tlsOptions: { rejectUnauthorized: false }
    };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.imap = new Imap(this.config);
      
      this.imap.once('ready', () => {
        console.log('Connected to email server');
        resolve();
      });

      this.imap.once('error', (err) => {
        console.error('Email connection error:', err);
        reject(err);
      });

      this.imap.connect();
    });
  }

  async processNewEmails() {
    try {
      await this.connect();
      return new Promise((resolve, reject) => {
        this.imap.openBox('INBOX', false, async (err, box) => {
          if (err) {
            reject(err);
            return;
          }
          
          this.imap.search(['ALL'], async (err, results) => {
            if (err) {
              reject(err);
              return;
            }
            
            console.log(`Found ${results.length} emails in inbox, checking for PDF attachments...`);
            console.log(`Email UIDs found: ${results.join(', ')}`);
            
            const emailPromises = results.map(uid => this.processEmail(uid));
            const allProcessedEmailsData = await Promise.allSettled(emailPromises);

            const processedEmails = [];
            let emailsWithPdf = 0;

            allProcessedEmailsData.forEach(result => {
              if (result.status === 'fulfilled' && result.value) {
                const emailData = result.value;
                console.log(`\n📧 Email "${emailData.subject}" (UID: ${emailData.email_id}) processed:`);
                console.log(`   - Attachments: ${emailData.attachments.length}`);
                console.log(`   - Receipts extracted: ${emailData.receiptData.length}`);
                console.log(`   - Date: ${emailData.date}`);
                
                if (emailData.attachments.length > 0) {
                  processedEmails.push(emailData);
                  emailsWithPdf++;
                  console.log(`   ✅ This email has PDF attachments and will be saved to ledger`);
                } else {
                  console.log(`   ❌ This email has no PDF attachments, skipping ledger save`);
                }
              } else if (result.status === 'rejected') {
                console.error('❌ Failed to process one email:', result.reason);
              }
            });
            
            console.log(`\n📊 Summary:`);
            console.log(`   - Total emails found: ${results.length}`);
            console.log(`   - Emails with PDF attachments: ${emailsWithPdf}`);
            console.log(`   - Emails to be saved to ledger: ${processedEmails.length}`);
            
            if (emailsWithPdf === 0) {
              console.log('\n⚠️  No PDF attachments found. This could mean:');
              console.log('1. The emails don\'t have PDF attachments');
              console.log('2. The PDF detection logic needs adjustment');
              console.log('3. The emails are in a different format');
              console.log('4. The "Here is the Receipt" email might not be in the inbox');
            }
            this.imap.end();
            resolve(processedEmails);
          });
        });
      });
    } catch (error) {
      console.error('Error processing emails:', error);
      throw error;
    }
  }

  processEmail(uid) {
    return new Promise((resolve, reject) => {
      console.log(`\n🔍 Processing email UID: ${uid}`);
      const fetch = this.imap.fetch(uid, { bodies: '', struct: true });
      
      let emailData = {
        email_id: uid,
        subject: '',
        date: '',
        attachments: [],
        receiptData: []
      };

      fetch.on('message', (msg, seqno) => {
        let parseBodyPromise = new Promise((resolveParseBody, rejectParseBody) => {
          msg.on('body', (stream, info) => {
            simpleParser(stream, (err, parsed) => {
              if (err) {
                console.error(`❌ Error parsing email body for UID ${uid}:`, err);
                rejectParseBody(err);
                return;
              }

              emailData.subject = parsed.subject || '';
              emailData.date = parsed.date ? parsed.date.toISOString() : '';
              
              console.log(`📧 Email UID ${uid}:`);
              console.log(`   Subject: "${emailData.subject}"`);
              console.log(`   Date: ${emailData.date}`);
              console.log(`   From: ${parsed.from?.text || 'Unknown'}`);

              // Process attachments
              if (parsed.attachments && parsed.attachments.length > 0) {
                console.log(`   📎 Found ${parsed.attachments.length} attachments:`);
                parsed.attachments.forEach((attachment, index) => {
                  console.log(`      ${index + 1}. ${attachment.filename} (Type: ${attachment.contentType})`);
                  if (attachment.contentType === 'application/pdf') {
                    emailData.attachments.push({
                      filename: attachment.filename,
                      content: attachment.content
                    });
                    console.log(`         ✅ PDF attachment detected: ${attachment.filename}`);
                  } else {
                    console.log(`         ❌ Not a PDF: ${attachment.filename}`);
                  }
                });
              } else {
                console.log(`   ❌ No attachments found`);
              }
              resolveParseBody();
            });
          });
        });

        msg.once('end', async () => {
          try {
            await parseBodyPromise;
          } catch (parseError) {
            console.error(`❌ Failed to parse email body for UID ${uid}:`, parseError);
          }

          // Process PDF attachments
          if (emailData.attachments.length > 0) {
            console.log(`   🔍 Initiating PDF parsing for email "${emailData.subject}" (UID: ${uid})...`);
            for (const attachment of emailData.attachments) {
              try {
                console.log(`      📄 Processing attachment: ${attachment.filename} (${attachment.content.length} bytes)`);
                
                const pdfResult = await PDFParser.parseReceipt(attachment.content);
                console.log(`      📊 PDF parsing result for ${attachment.filename}:`, JSON.stringify(pdfResult, null, 2));
                
                if (pdfResult.success) {
                  emailData.receiptData.push({
                    filename: attachment.filename,
                    ...pdfResult.data
                  });
                  console.log(`      ✅ Successfully parsed PDF: ${attachment.filename}`);
                  console.log(`         Merchant: ${pdfResult.data.merchant_name}`);
                  console.log(`         Amount: $${pdfResult.data.amount}`);
                  console.log(`         Date: ${pdfResult.data.date}`);
                } else {
                  console.log(`      ❌ Failed to parse PDF: ${attachment.filename}`);
                  console.log(`         Error: ${pdfResult.error}`);
                  console.log(`         Raw text length: ${pdfResult.rawText.length}`);
                  console.log(`         Raw text preview: ${pdfResult.rawText.substring(0, 200)}...`);
                }
              } catch (error) {
                console.error(`      ❌ Error during PDF parsing for attachment ${attachment.filename} in email UID ${uid}:`, error);
              }
            }
          } else {
            console.log(`   ⚠️  No PDF attachments found or detected for email "${emailData.subject}" (UID: ${uid}). Skipping PDF parsing.`);
          }
          console.log(`   ✅ Finished processing email "${emailData.subject}" (UID: ${uid}). Total attachments found: ${emailData.attachments.length}, Total receipts extracted: ${emailData.receiptData.length}`);
          resolve(emailData);
        });
      });

      fetch.once('error', (err) => {
        console.error('❌ Fetch error for UID', uid, ':', err);
        reject(err);
      });
    });
  }

  async saveToLedger(emailData) {
    console.log(`\n=== Saving to Ledger ===`);
    console.log(`Email ID: ${emailData.email_id}`);
    console.log(`Subject: ${emailData.subject}`);
    console.log(`Receipt data count: ${emailData.receiptData.length}`);
    console.log(`Receipt data:`, JSON.stringify(emailData.receiptData, null, 2));
    
    const results = [];
    
    // Ensure receiptData is an array
    if (!Array.isArray(emailData.receiptData)) {
      console.log('❌ receiptData is not an array, converting to array');
      emailData.receiptData = emailData.receiptData ? [emailData.receiptData] : [];
    }
    
    for (const receipt of emailData.receiptData) {
      try {
        console.log(`\nProcessing receipt: ${receipt.filename || 'unnamed'}`);
        console.log(`Merchant: ${receipt.merchant_name}`);
        console.log(`Amount: $${receipt.amount}`);
        console.log(`Date: ${receipt.date}`);
        
        // Check if email already processed - but allow re-processing for testing
        const existing = await getRow(
          'SELECT id FROM email_processing_log WHERE email_id = ?',
          [emailData.email_id]
        );

        if (existing) {
          console.log(`Email ${emailData.email_id} already processed - but allowing re-processing for testing`);
          // For now, we'll allow re-processing by continuing instead of skipping
          // TODO: In production, you might want to skip or update existing entries
        }

        // Check if receipt data is valid before inserting
        const isValidReceipt = receipt.merchant_name && 
                              receipt.merchant_name.trim() !== '' && 
                              receipt.amount > 0 &&
                              receipt.isValid !== false;

        if (!isValidReceipt) {
          console.log(`❌ Skipping invalid receipt data:`);
          console.log(`   Merchant: "${receipt.merchant_name}"`);
          console.log(`   Amount: ${receipt.amount}`);
          console.log(`   Is Valid: ${receipt.isValid}`);
          console.log(`   Raw Text Length: ${receipt.rawText ? receipt.rawText.length : 0}`);
          console.log(`   Raw Text Preview: ${receipt.rawText ? receipt.rawText.substring(0, 100) : 'N/A'}`);
          continue; // Skip this receipt
        }

        // Insert into ledger
        console.log(`✅ Inserting valid receipt into ledger:`, {
          email_id: emailData.email_id,
          email_subject: emailData.subject,
          email_date: emailData.date,
          merchant_name: receipt.merchant_name,
          amount: receipt.amount,
          date: receipt.date || new Date().toISOString().split('T')[0],
          category: receipt.category || 'Retail',
          description: receipt.description || `Purchase from ${receipt.merchant_name} for $${receipt.amount}`,
          receipt_text: receipt.rawText || ''
        });

        const ledgerResult = await runQuery(
          `INSERT INTO ledger (
            email_id, email_subject, email_date, merchant_name, 
            amount, date, category, description, receipt_text
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            emailData.email_id,
            emailData.subject,
            emailData.date,
            receipt.merchant_name || 'Unknown Merchant',
            receipt.amount || 0,
            receipt.date || new Date().toISOString().split('T')[0],
            receipt.category || 'Retail',
            receipt.description || 'Receipt processing',
            receipt.rawText || ''
          ]
        );

        console.log(`✅ Successfully saved to ledger with ID: ${ledgerResult.lastID}`);

        // Log processing - update existing entry if it exists, otherwise insert new
        if (existing) {
          await runQuery(
            'UPDATE email_processing_log SET processed_at = ?, status = ? WHERE email_id = ?',
            [new Date().toISOString(), 'processed', emailData.email_id]
          );
        } else {
          await runQuery(
            'INSERT INTO email_processing_log (email_id, processed_at, status) VALUES (?, ?, ?)',
            [emailData.email_id, new Date().toISOString(), 'processed']
          );
        }

        results.push({
          success: true,
          ledger_id: ledgerResult.lastID,
          receipt: receipt
        });

        console.log(`✅ Receipt saved successfully to ledger`);
      } catch (error) {
        console.error('❌ Error saving to ledger:', error);
        
        // Log error
        await runQuery(
          'INSERT INTO email_processing_log (email_id, processed_at, status, error_message) VALUES (?, ?, ?, ?)',
          [emailData.email_id, new Date().toISOString(), 'error', error.message]
        );

        results.push({
          success: false,
          error: error.message,
          receipt: receipt
        });
      }
    }
    
    console.log(`\n=== Ledger Save Complete ===`);
    console.log(`Total results: ${results.length}`);
    console.log(`Successful: ${results.filter(r => r.success).length}`);
    console.log(`Failed: ${results.filter(r => !r.success).length}`);

    return results;
  }
}

module.exports = EmailService; 