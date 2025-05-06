export const resetPasswordEmailTemplate = (resetLink: string) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333333;
        margin: 0;
        padding: 0;
        background-color: #f9f9f9;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      .header {
        text-align: center;
        padding: 20px 0;
        border-bottom: 1px solid #eeeeee;
      }
      .logo {
        max-width: 150px;
        height: auto;
      }
      .content {
        padding: 30px 20px;
        text-align: center;
      }
      .title {
        color: #D61E1E;
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 20px;
      }
      .message {
        font-size: 16px;
        margin-bottom: 30px;
      }
      .button {
        display: inline-block;
        background-color: #D61E1E;
        color: #ffffff !important;
        text-decoration: none;
        padding: 12px 30px;
        border-radius: 4px;
        font-weight: bold;
        margin: 20px 0;
        transition: background-color 0.3s;
      }
      .button:hover {
        background-color: #b51919;
      }
      .footer {
        text-align: center;
        padding: 20px;
        color: #666666;
        font-size: 14px;
        border-top: 1px solid #eeeeee;
      }
      .note {
        font-size: 13px;
        color: #777777;
        margin-top: 30px;
      }
      .alert {
        background-color: #fff8e1;
        border-left: 4px solid #ffc107;
        padding: 15px;
        margin: 20px 0;
        text-align: left;
        font-size: 14px;
        color: #5d4037;
      }
      @media only screen and (max-width: 600px) {
        .container {
          width: 100%;
          border-radius: 0;
        }
        .content {
          padding: 20px 15px;
        }
        .title {
          font-size: 22px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <!-- Replace with your company logo -->
        <h2 style="color: #D61E1E; margin: 0;">TecNet</h2>
      </div>
      <div class="content">
        <div class="title">Reset Your Password</div>
        <div class="message">
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          <div class="alert">
            <strong>Important:</strong> This link will expire in 1 hour for security reasons.
          </div>
          <p class="note">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          <p class="note">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; font-size: 12px; color: #777777;">${resetLink}</p>
        </div>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Company Name. All rights reserved.</p>
        <p>123 Business Street, City, Country</p>
      </div>
    </div>
  </body>
  </html>
    `;
};
