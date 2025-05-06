export const quoteRequestEMailTemplate = (data: {
  subject: string;
  name: string;
  email: string;
  message: string;
  requirementsFile?: string;
}) => `
  <!DOCTYPE html>
  <html>
  <head>
      <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 30px; }
          .header { border-bottom: 2px solid #D61E1E; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { max-width: 150px; }
          h2 { color: #D61E1E; margin-top: 0; }
          .details { margin-bottom: 25px; }
          .detail-item { margin-bottom: 15px; }
          .detail-label { font-weight: bold; color: #D61E1E; }
          .file-link { 
              display: inline-block;
              padding: 10px 20px;
              background-color: #D61E1E;
              color: white !important;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 15px;
          }
          .footer { 
              text-align: center;
              padding: 20px;
              color: #666666;
              font-size: 14px;
              border-top: 1px solid #eeeeee;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h2>New Quote Request: ${data.subject}</h2>
          </div>
          
          <div class="details">
              <div class="detail-item">
                  <span class="detail-label">From:</span> ${data.name}
              </div>
              <div class="detail-item">
                  <span class="detail-label">Email:</span> ${data.email}
              </div>
              <div class="detail-item">
                  <span class="detail-label">Message:</span>
                  <p>${data.message}</p>
              </div>
              
              ${
                data.requirementsFile
                  ? `
              <div class="detail-item">
                  <span class="detail-label">Attached File:</span>
                  <a href="${data.requirementsFile}" class="file-link">Download Requirements</a>
              </div>
              `
                  : ''
              }
          </div>
  
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} TecNet. All rights reserved.</p>
              <p></p>
              <p>Please do not reply directly to this email.</p>
          </div>
      </div>
  </body>
  </html>
  `;
