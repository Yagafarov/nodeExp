const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const token = '6623483054:AAFhCFf1RVHVhgZKdT8e0RkLFkbJUYeH4Aw';
const bot = new TelegramBot(token, { polling: true });

// for registration
let registeredUsers = [];
function saveRegisteredUsersToFile() {
    const jsonUsers = JSON.stringify(registeredUsers, null, 2);
    fs.writeFileSync('registeredUsers.json', jsonUsers);
}

// Load registered users from file (if the file exists)
if (fs.existsSync('registeredUsers.json')) {
    const fileContent = fs.readFileSync('registeredUsers.json', 'utf8');
    registeredUsers = JSON.parse(fileContent);
}


// NATIJA UCHUN
const quizResultsFile = 'quizResults.json';


// Function to read file content, parse JSON, and send it to the channel
function getJsonFileToChannel(fileName) {
    if (fs.existsSync(fileName)) {
        try {
            const fileContent = fs.readFileSync(fileName, 'utf8');
            const jsonData = JSON.parse(fileContent);

            // Convert JSON to a formatted string
            const formattedData = JSON.stringify(jsonData, null, 2);

            return formattedData;
        } catch (error) {
            return -1;
        }
    } else {
        return 1;
    }
}


// Function to save quiz results to file
function saveQuizResultsToFile() {
    const jsonResults = JSON.stringify(quizResults, null, 2);
    fs.writeFileSync(quizResultsFile, jsonResults);
}

// Load quiz results from file (if the file exists)
let quizResults = {};

if (fs.existsSync(quizResultsFile)) {
    const fileContent = fs.readFileSync(quizResultsFile, 'utf8');
    quizResults = JSON.parse(fileContent);
}


// Define the quiz questions
const quizQuestions = [
    {
        question: "# 2*2 necha bo'ladi?",
        options: ["3", "4", "0", "8"],
        correctAnswer: "+4"
    },
    {
        question: "# 2-2 necha bo'ladi?",
        options: ["7", "4", "0", "1"],
        correctAnswer: "+0"
    },
    {
        question: "# 2+2 necha bo'ladi?",
        options: ["9", "4", "0", "2"],
        correctAnswer: "+4"
    },
    // Add more questions as needed
];

// Function to start the quiz
function startQuizWithButtons(chatId) {
    // Check if there are questions available

    if (quizQuestions.length > 0) {
        const userChatId = chatId;

        // Check if the user has previous quiz results
        if (quizResults[userChatId]) {
            // Delete previous quiz results
            delete quizResults[userChatId];
            saveQuizResultsToFile();
        }
        sendNextQuestionWithButtons(chatId, 0, 0); // Start with the first question and 0 correct answers
    } else {
        bot.sendMessage(chatId, "Quiz savollari mavjud emas. Iltimos, /setTest buyrug'ini ishlatib quiz savollarni o'rnatng.");
    }
}

// Function to send the next question
function sendNextQuestionWithButtons(chatId, index, correctAnswers) {
    const questionObj = quizQuestions[index];

    if (questionObj) {
        const options = questionObj.options.map(option => [{ text: option }]); // Create buttons for each option
        const replyMarkup = { keyboard: options, resize_keyboard: true };

        const quizQuestion = `${questionObj.question}`;
        bot.sendMessage(chatId, quizQuestion, { reply_markup: replyMarkup }).then(() => {
            // Listen for incoming text messages
            bot.once('text', (msg) => {
                const userChatId = msg.chat.id;
                const userAnswer = msg.text.trim().toLowerCase();


                // Check the user's answer
                let responseMessage;
                let realAnswer = questionObj.correctAnswer.toLowerCase()
                if (!quizResults[userChatId]) {
                    quizResults[userChatId] = { correctAnswers: 0 };
                }
                if (userAnswer === realAnswer.slice(1)) {
                    responseMessage = 'To\'g\'ri javob! 🎉';
                    correctAnswers++;
                    quizResults[userChatId].correctAnswers++;
                } else {
                    responseMessage = `Noto\'g\'ri javob. To\'g\'ri javob: ${questionObj.correctAnswer}`;
                }
                saveQuizResultsToFile();
                // Display the response to the user
                bot.sendMessage(userChatId, responseMessage);

                // Send the next question with buttons after a delay
                setTimeout(() => {
                    sendNextQuestionWithButtons(userChatId, index + 1, correctAnswers);
                }, 1000);
            });
        });
    } else {
        // No more questions, quiz completed
        const resultMessage = `Savollar tugadi. Siz ${quizQuestions.length} ta dan ${correctAnswers} ta savolga to'g'ri javob berdingiz!`;
        bot.sendMessage(chatId, resultMessage);
    }
}

// Command handler for /checkQuestions
bot.onText(/\/checkQuestions/, (msg) => {
    const chatId = msg.chat.id;

    // Check if there are questions available
    if (quizQuestions.length > 0) {
        // Display the current set of quiz questions
        const questionsMessage = quizQuestions.map((question, index) => {
            return `${index + 1}. ${question.question}\nOptions: ${question.options.join(', ')}\nCorrect Answer: ${question.correctAnswer}`;
        }).join('\n\n');

        bot.sendMessage(chatId, `Current Set of Quiz Questions:\n\n${questionsMessage}`);
    } else {
        bot.sendMessage(chatId, "Quiz savollari mavjud emas. Iltimos, /setTest buyrug'ini ishlatib quiz savollarni o'rnatng.");
    }
});


// Command handler for /setTest
const setTestPassphrase = '2024'; // Replace with your desired passphrase

bot.onText(/\/setTest/, (msg) => {
    const chatId = msg.chat.id;

    // Check if the user entered the correct passphrase
    const userInput = msg.text.trim().split(/\s+/); // Split the command and passphrase
    if (userInput.length === 2 && userInput[1] === setTestPassphrase) {
        const setTestMessage = `Test savollarini o'rnatish uchun quyidagi formatni foydalaning:

# Savol 1
+ To'g'ri variant
- Noto'g'ri variant
- Noto'g'ri variant
- Noto'g'ri variant

# Savol 2
+ To'g'ri variant
- Noto'g'ri variant
- Noto'g'ri variant
- Noto'g'ri variant

...

Har bir savol va javoblar bir qatorga yozilishi kerak. Misol uchun yuqorida 2 ta savol berilgan.`;

        bot.sendMessage(chatId, setTestMessage);

        // Listen for incoming text messages
        bot.once('text', (msg) => {
            const userChatId = msg.chat.id;
            const userInput = msg.text.trim();

            // Process the user input and set the new quiz questions
            const newQuestions = parseUserInput(userInput);

            // Update the quizQuestions array with the new questions
            if (newQuestions.length > 0) {
                quizQuestions.length = 0;
                Array.prototype.push.apply(quizQuestions, newQuestions);
                bot.sendMessage(userChatId, "Test savollari o'zgartirildi!");
            } else {
                bot.sendMessage(userChatId, "Noto'g'ri format. Test savollari o'zgartirilmadi.");
            }
        });
    } else {
        // If the passphrase is incorrect, inform the user
        bot.sendMessage(chatId, "Uzr, maxfiy kiritish noto'g'ri. Qayta urinib ko'ring");
    }
});


// Function to parse user input and generate new quiz questions
function parseUserInput(input) {
    const questionsArray = input.split('#');
    const formattedQuestions = [];

    for (const questionStr of questionsArray) {
        const lines = questionStr.trim().split('\n');
        if (lines.length > 1) {
            const question = lines[0].trim();
            const options = lines.slice(1).map(line => line.trim());

            // Ensure there are exactly 4 options
            let trimmedOptions = options.slice(0, 4);

            // Pad with empty options if there are less than 4
            while (trimmedOptions.length < 4) {
                trimmedOptions.push('');
            }
            let modifiedOptions = trimmedOptions.map(originalString => {
                // Faqat birinchi belgini o'chirish
                return originalString.substring(1);
                // yoki
                // return originalString.slice(1);
            });
            const correctAnswer = modifiedOptions[0]; // Index of the correct answer (first option)

            formattedQuestions.push({
                question: question,
                options: modifiedOptions,
                correctAnswer: correctAnswer
            });
        }
    }

    return formattedQuestions;
}
// Command handler for /start

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check if the user is already registered
    const isUserRegistered = registeredUsers.some(user => user.userId === userId);

    if (isUserRegistered) {
        bot.sendMessage(chatId, `Tizimga qaytganingizdan hursandman @${msg.from.username}!`);
    } else {
        // Foydalanuvchidan ma'lumot so'ragan xabarni yuborish
        bot.sendMessage(chatId, `Assalomu alaykum <b>@${msg.from.username}</b> online quizz botga xush kelibsiz!\nBotdan foydalanish uchun ro'yxatdan o'tishingiz kerak. Telefon raqamingizni ulashing.`, {
            reply_markup: {
                keyboard: [[{ text: "Telefon raqamni ulashish", request_contact: true }]],
                resize_keyboard: true,
            },
        }, { parse_mode: 'HTML' });

        // Aloqa ma'lumotlarini kuzatish
        bot.once('contact', (contactMsg) => {
            const userContact = contactMsg.contact;
            const phoneNumber = userContact.phone_number;

            // Foydalanuvchidan Telegram foydalanuvchi nomini so'rab yuborish
            bot.sendMessage(chatId, `Rahmat! Endi,\nIsm familiyangizni to'liq yozing (misol: Teshayev Bolta):`, {
                reply_markup: {
                    force_reply: true,
                    selective: true,
                },
            });

            // Foydalanuvchi nomini kuzatish
            bot.once('text', (usernameMsg) => {
                const ism = usernameMsg.text;
                const username = usernameMsg.from.username;

                // Foydalanuvchini aloqa ma'lumotlari va foydalanuvchi nomi bilan ro'yxatga olish
                registeredUsers.push({ userId, phoneNumber, username, ism });
                saveRegisteredUsersToFile();
                bot.sendMessage(chatId, `Siz muvaffaqiyatli ro'yxatdan o'tdingiz!\n<b>Ism</b>: ${ism}\n<b>Telefon raqami</b>: ${phoneNumber}\n<b>Foydalanuvchi nomi</b>: ${username}`, { parse_mode: 'HTML' });
            });
        });

    }
});

process.on('SIGINT', () => {
    saveRegisteredUsersToFile();
    saveQuizResultsToFile();
    process.exit();
});

// Command handler for /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `Buyruqlar:\n
    /test - Quizni boshlash
    /setTest - Test savollarini o'rnatish
    /checkQuestions - Joriy savol variantlari bilan tanishish
    /help - Buyruqlar ro'yxati`;;

    bot.sendMessage(chatId, helpMessage);
});

// Command handler for /test
bot.onText(/\/test/, (msg) => {
    const chatId = msg.chat.id;
    // Start the quiz
    startQuizWithButtons(chatId);
});

// Command handler for /stat
const adminPassword = '2024';  // Replace with your desired admin password


bot.onText(/\/stat/, (msg) => {
    const chatId = msg.chat.id;
    const userPassword = msg.text.split(' ')[1];

    // Check if the provided password is correct
    if (userPassword === adminPassword) {
        // Password is correct, perform actions or send statistics
        let r = getJsonFileToChannel('registeredUsers.json');
        // Send quizResults.json content to the channel
        let q = getJsonFileToChannel('quizResults.json');
       
        const channel = "@testanodra"
        // Send the formatted data to the channel
        bot.sendMessage(channel, `Ro'yxatdan o'tkanlar:\n${r}`);
        bot.sendMessage(channel, `Test topshirganlar:\n${q}`);
    } else {
        // Password is incorrect, inform the user
        bot.sendMessage(chatId, '{Parol noto`g`ri kiritildi}');
    }
});