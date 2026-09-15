 const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Enable CORS for React frontend running on port 3000
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// ----------------- USER DATABASE & SECURITY CONFIG ----------------- //
const users = [];
const JWT_SECRET = 'your_super_secret_jwt_key_123';

// ----------------- AUTHENTICATION ROUTES ----------------- //

// Signup Route
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const existingUser = users.find((u) => u.email === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email is already registered.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now(), name, email: email.toLowerCase(), password: hashedPassword };
  users.push(newUser);

  const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

  return res.status(201).json({
    success: true,
    message: 'Account created successfully!',
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email },
  });
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password.' });
  }

  const user = users.find((u) => u.email === email.toLowerCase());
  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid email or password.' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ success: false, message: 'Invalid email or password.' });
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  return res.status(200).json({
    success: true,
    message: 'Logged in successfully!',
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

// ----------------- NODEMAILER SETUP ----------------- //
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'abdullahaqdas72@gmail.com',
    // App Password generated from Google
    pass: 'jkvp tlxd abmy lqwm',
  },
});

// Verify transporter connection on server start
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('Server is ready to send emails to abdullahaqdas72@gmail.com');
  }
});

// ----------------- ORDER EMAIL ROUTE ----------------- //
app.post('/api/send-order-email', async (req, res) => {
  const { customer, items, totalAmount, orderDate } = req.body;

  if (!customer || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Missing order details.' });
  }

  const itemsListHTML = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; color: #1e293b;">${item.name}</td>
        <td style="padding: 10px; text-align: center; color: #475569;">${item.quantity}</td>
        <td style="padding: 10px; text-align: right; color: #e67e22; font-weight: bold;">$${item.price}</td>
      </tr>`
    )
    .join('');

  const mailOptions = {
    from: '"Apna Culture Store" <abdullahaqdas72@gmail.com>',
    to: 'abdullahaqdas72@gmail.com', // Admin recipient
    subject: `New Order Received - ${customer.fullName} (${orderDate})`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #e67e22; margin-top: 0;">New Order Confirmation</h2>
          <p><strong>Order Timestamp:</strong> ${orderDate}</p>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />

          <h3 style="color: #1e293b;">Customer Details:</h3>
          <ul style="list-style: none; padding: 0; line-height: 1.8;">
            <li><strong>Full Name:</strong> ${customer.fullName}</li>
            <li><strong>Email:</strong> ${customer.email}</li>
            <li><strong>Contact Number:</strong> ${customer.phone}</li>
            <li><strong>Shipping Address:</strong> ${customer.address}, ${customer.postalCode}, ${customer.country}</li>
          </ul>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />

          <h3 style="color: #1e293b;">Order Details:</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding: 10px;">Item</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHTML}
            </tbody>
          </table>

          <div style="text-align: right; font-size: 1.2rem; font-weight: bold; color: #0f172a;">
            Total Amount: <span style="color: #e67e22;">$${totalAmount}</span>
          </div>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return res.status(200).json({ success: true, message: 'Order email delivered successfully.' });
  } catch (error) {
    console.error('Nodemailer Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// Signup Route in server.js
app.post('/api/auth/signup', async (req, res) => {
  const { fullName, name, email, password } = req.body;
  const userName = fullName || name; // Handles both fullName and name

  if (!userName || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const existingUser = users.find((u) => u.email === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email is already registered.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now(),
    fullName: userName,
    email: email.toLowerCase(),
    password: hashedPassword,
  };
  users.push(newUser);

  const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

  return res.status(201).json({
    success: true,
    message: 'Account created successfully!',
    token,
    user: { id: newUser.id, fullName: newUser.fullName, email: newUser.email },
  });
});
app.post('/api/auth/signup', async (req, res) => {
  const { name, fullName, email, password } = req.body;
  const userName = name || fullName;

  if (!userName || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  // Rest of your signup logic...
});
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, address, parcelNumber, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
  }

  const mailOptions = {
    from: `"Apna Culture Support" <abdullahaqdas72@gmail.com>`,
    to: 'abdullahaqdas72@gmail.com',
    replyTo: email,
    subject: `New Inquiry: ${subject || 'General Contact'} - ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; padding: 20px; color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="color: #e67e22; margin-top: 0;">New Contact Form Message</h2>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 16px 0;" />
          <p><strong>Customer Name:</strong> ${name}</p>
          <p><strong>Customer Email:</strong> <a href="mailto:${email}" style="color: #38bdf8;">${email}</a></p>
          <p><strong>Contact Phone:</strong> ${phone || 'Not Provided'}</p>
          <p><strong>Delivery Address:</strong> ${address || 'Not Provided'}</p>
          <p><strong>Parcel / Tracking #:</strong> ${parcelNumber ? `<span style="background-color: #e67e22; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${parcelNumber}</span>` : 'N/A'}</p>
          <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 16px 0;" />
          <h3 style="color: #f8fafc; margin-bottom: 8px;">Message:</h3>
          <p style="background-color: #0f172a; padding: 16px; border-radius: 8px; line-height: 1.6; color: #cbd5e1; white-space: pre-wrap;">${message}</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: 'Your message and parcel details have been sent successfully!' });
  } catch (error) {
    console.error('Contact Email Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message. Please try again later.' });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));