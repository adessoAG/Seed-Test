const nodemailer = require('nodemailer');

async function sendResetLink(email, id){
    const transporter = nodemailer.createTransport({
        host: 'smtp.web.de',
        port: 587,
        auth: {
            user: '',
            pass: ''
        }
    });

    const mailOptions = {
        from: 'c-niebergall@web.de',
        to: email,
        subject: 'Seed-Test-Passwort-Reset',
        text: "Dies ist eine automatische Email, bitte antworten sie nicht darauf. /n/n Sie oder jemand anderes hat versucht das Passwort für ihren Seed-Test-Account zu ändern. Sollten sie das nicht wünschen, ignorieren Sie einfach diese E-Mail. Wünschen sie ihr Passwort zu ändern klicken sie bitte den folgenden Link oder geben sie den Link in ihre Adresszeile des Browsers ein. /n" + 'https://seed-test-frontend.herokuapp.com/resetpasswordconfirm' + id
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports = {
    sendResetLink
};