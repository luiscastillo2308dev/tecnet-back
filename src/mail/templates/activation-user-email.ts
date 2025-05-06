export const activationUserEmailTemplate = (confirmationLink: string) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
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
        <div class="title">Verify Your Email Address</div>
        <div class="message">
          <p>Thank you for registering! To complete your registration and activate your account, please click the button below:</p>
          <a href="${confirmationLink}" class="button">Verify Email</a>
          <p class="note">If you didn't create an account, you can safely ignore this email.</p>
          <p class="note">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; font-size: 12px; color: #777777;">${confirmationLink}</p>
        </div>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} TecNet. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
    `;
};
