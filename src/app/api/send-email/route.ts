import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email, fullName, eventName, eventDate, attendeeId } = await request.json();

    if (!email || !eventName || !attendeeId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${attendeeId}`;

    const mailOptions = {
      from: `"Vendy Access Portal" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Your Registration for ${eventName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #6b21a8;">Registration Confirmed!</h2>
          <p>Hi ${fullName || 'Attendee'},</p>
          <p>You have successfully registered for <strong>${eventName}</strong> on ${eventDate}.</p>
          <p>Please use the QR code below at the venue to access the smart vending machine:</p>
          <div style="text-align: center; margin: 30px 0;">
            <img src="${qrCodeUrl}" alt="Your Access QR Code" style="border: 2px solid #ddd; padding: 10px; border-radius: 8px;" />
          </div>
          <p style="font-size: 0.9em; color: #666;">Keep this QR code handy during the event.</p>
          <hr style="border: 1px solid #eee; margin-top: 30px;" />
          <p style="font-size: 0.8em; color: #999;">Vendy Smart Event Companion</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
