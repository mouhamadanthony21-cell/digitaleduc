<?php
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';
require 'PHPMailer/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $nom     = htmlspecialchars($_POST['nom']);
    $email   = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
    $sujet   = htmlspecialchars($_POST['sujet']);
    $message = htmlspecialchars($_POST['message']);

    echo "<h1>Message bien reçu !</h1>";
    echo "<p><strong>Nom :</strong> " . $nom . "</p>";
    echo "<p><strong>Email :</strong> " . $email . "</p>";
    echo "<p><strong>Sujet :</strong> " . $sujet . "</p>";
    echo "<p><strong>Message :</strong> " . $message . "</p>";
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;

        $mail->Username   = 'mouhamadanthony2.1@gmail.com'; 
        $mail->Password   = 'jwulllarfvttwrpt';

        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom('mouhamadanthony2.1@gmail.com', 'Site DigitalEduc');
        $mail->addAddress('mouhamadanthony2.1@gmail.com');
        $mail->addReplyTo($email, $nom);

        $mail->isHTML(true);
        $mail->Subject = "Nouveau message de contact : $sujet";
        $mail->Body    = "
            <h2>Nouveau message reçu depuis le site</h2>
            <p><strong>Nom :</strong> $nom</p>
            <p><strong>Email :</strong> $email</p>
            <p><strong>Sujet :</strong> $sujet</p>
            <p><strong>Message :</strong><br>$message</p>
        ";
        $mail->AltBody = "Nom : $nom\nEmail : $email\nSujet : $sujet\n\nMessage :\n$message";

        $mail->send();

        echo "<h1 style='font-family: sans-serif; color: green;'>✅ Message envoyé avec succès !</h1>";
        echo "<p style='font-family: sans-serif;'>Merci $nom, nous avons bien reçu votre message et vous répondrons rapidement.</p>";
        echo "<a href='Contacts.html' style='font-family: sans-serif;'>Retour au formulaire</a>";

    } catch (Exception $e) {
        echo "<h1 style='font-family: sans-serif; color: red;'>❌ Erreur lors de l'envoi</h1>";
        echo "<p style='font-family: sans-serif;'>Détail : {$mail->ErrorInfo}</p>";
        echo "<a href='Contacts.html' style='font-family: sans-serif;'>Retour au formulaire</a>";
    }

} else {
    echo "Accès direct non autorisé.";
}
?>