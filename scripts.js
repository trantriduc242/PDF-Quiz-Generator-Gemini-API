import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import * as pdfjsLib from './node_modules/pdfjs-dist/webpack.mjs';

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];  
const API_KEY = "AIzaSyBhEtbUm6fLwvdXCjwASQycgeE9ZAAtJmg";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings});
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

let loadingInterval;
let file;

try {
    const pdfInput = document.getElementById('pdf-upload');
    pdfInput.addEventListener('change', function(e) {
        file = e.target.files[0];  
    });
} catch {
    
}

function showLoadingScreen(text) {
    document.getElementById('loading-text').innerText = text;
    document.getElementById('loading-screen').style.display = 'flex';
    let dots = 0;
    loadingInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        const dotString = '.'.repeat(dots);
        document.getElementById('loading-text').innerText = `${text}${dotString}`;
    }, 200);
}

function hideLoadingScreen() {
    clearInterval(loadingInterval);
    document.getElementById('loading-screen').style.display = 'none';
}
const ConfirmTopics = document.querySelectorAll('#confirmTopic');

ConfirmTopics.forEach(ConfirmTopic => {
    ConfirmTopic.addEventListener('click', () => {
        const topic = document.getElementById('topic').value;
        if (!topic) alert("Please enter at least 1 level/topic!");
        else {
            localStorage.setItem('state', 0);
            localStorage.setItem('topic', topic);
            window.location.href = 'amount.html';
        }
    });
});


try { 
    document.getElementById('flashcards-amount').addEventListener('input', function() {
        document.getElementById('flashcards-value').innerText = this.value;
    });

    document.getElementById('quizzes-amount').addEventListener('input', function() {
        document.getElementById('quizzes-value').innerText = this.value;
    });

    const ConfirmAmounts = document.querySelectorAll('#confirmAmount');

    ConfirmAmounts.forEach(ConfirmAmount => {
        ConfirmAmount.addEventListener('click', () => {
            const flashcardsAmount = document.getElementById('flashcards-amount').value;
            const quizzesAmount = document.getElementById('quizzes-amount').value;
            localStorage.setItem('flashcardsAmount', flashcardsAmount);
            localStorage.setItem('quizzesAmount', quizzesAmount);
            window.location.href = 'flashcards.html';
        });
    });
} catch {

}

const ConfirmPDFs = document.querySelectorAll('#confirmPDF');

ConfirmPDFs.forEach(ConfirmPDF => {
    ConfirmPDF.addEventListener('click', () => {
        // Check if a file was selected and it's a PDF
        if (file && file.type === 'application/pdf') {
            localStorage.setItem('state', 1);
            console.log("HELLO")
            const reader = new FileReader(); 
            reader.onload = function(event) {
                const pdfData = new Uint8Array(event.target.result);  // Get PDF data

                // Use pdf.js to load the PDF
                pdfjsLib.getDocument({ data: pdfData }).promise.then(pdf => {
                    const numPages = pdf.numPages;  // Get the number of pages in the PDF
                    let extractedText = '';  

                    // Function to extract text from each page
                    const extractTextFromPage = (pageNum) => {
                        return pdf.getPage(pageNum).then(page => {
                            return page.getTextContent().then(textContent => {
                                let pageText = '';  // Store the text content of the page

                                // Combine the text items into a single string
                                textContent.items.forEach(item => {
                                    pageText += item.str + ' ';
                                });

                                return pageText;
                            });
                        });
                    };

                    // Loop through all pages and extract text
                    let textPromises = [];
                    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                        textPromises.push(extractTextFromPage(pageNum));
                    }

                    // Once all text is extracted, combine and display it
                    Promise.all(textPromises).then(pagesText => {
                        extractedText = pagesText.join('\n');  // Combine text from all pages
                        console.log('Extracted Text:', JSON.stringify(extractedText));  // Log the extracted text
                        localStorage.setItem('extractedText', JSON.stringify(extractedText));
                    });
                    
                });
            };

            reader.readAsArrayBuffer(file);  // Start reading the PDF file as an ArrayBuffer
            
            window.location.href = 'amount.html';
        } else {
            alert('Please select a valid PDF file.');  // Alert if the file is not a PDF
        }
    });
});

let flashcards = [];
let currentFlashcard = 0;
let learnedCount = 0;

async function prompting(prompt, temp) {
    const result = await model.generateContent({
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: prompt,
                    }
                ],
            }
        ],
        generationConfig: {
            temperature: temp,
        },
    });
    
    const response = await result.response;
    return response.text();
}

async function fetchVocabulary() {
    showLoadingScreen('Generating Flashcards');
    let ans;
    const flashcardsAmount = localStorage.getItem('flashcardsAmount');
    console.log(flashcardsAmount);
    if(localStorage.getItem("state") == 0) { 
        // If input text
        console.log("Input Topic");
        const topic = localStorage.getItem('topic');
        // const response = await fetch('http://localhost:3000/generateVocabulary', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ topic })
            // });
        const prompt = `Search the online English dictionary to generate a list of ${flashcardsAmount} words based on 
        ${topic} vocabulary as the structure "<word> $%$ (<parts of speech>) <meaning>" without saying anything else. 
        Don't add bold character in your response`;
        
        ans = await prompting(prompt, 2);
    } else if(localStorage.getItem("state") == 1) {
        // If input PDF
        let data = JSON.parse(localStorage.getItem('extractedText'));
        console.log(data);
        const prompt = `I am using Anki to study, I need to make practice questions out of my notes. 
        Anki is a flashcard tool, and it will make two sided flashcards out of it, for me. 
        With the upcoming text, can you summarize and divide main ideas into important section using English. From that summarization of important questions, 
        make the flashcards info with the question as the front of the card and the answer/definition is the back of the flashcard;
        Make around ${flashcardsAmount} flashcards and format it on the flashcards as the OBLIGATORY structure: "<Front text> $%$ <Back text>"  without the "" characters (The format is: <Front text> $%$ <Back text> where you will be replace <Front text> and <Back text> with your own generated text). 
        Just list out without saying anything else, even the bullet point is a no. 
        Don't add bold character in your response, just write down plain text. Text:` + data;

        ans = await prompting(prompt, 1);
        // ar[i] = await correcting(item);
        // text.forEach(async function(item, i, ar) {
        // });
    } 
    
    var str = ans + '';
    console.log(str);
    localStorage.setItem('PreResponse',str);

    flashcards = str.split('\n').filter(Boolean).map(item => {
        const [word, meaning] = item.split(' $%$ ');
        return { word, meaning };
    });
    hideLoadingScreen()
    displayFlashcard();
    return str;
}

function displayFlashcard() {
    if (flashcards.length === 0) return;
    const flashcardElement = document.getElementById('flashcard');
    flashcardElement.innerHTML = `
        <div class="front">${flashcards[currentFlashcard].word}</div>
        <div class="back">${flashcards[currentFlashcard].meaning}</div>
    `;
}

const STLButtons = document.querySelectorAll("#stlButton");

STLButtons.forEach(STLButton => {
    STLButton.addEventListener('click', () => {
        flashcards.push(flashcards.splice(currentFlashcard, 1)[0]);
        displayFlashcard();
    })
});

const LButtons = document.querySelectorAll("#lButton");

LButtons.forEach(LButton => {
    LButton.addEventListener('click', () => {
        learnedCount++;
        flashcards.splice(currentFlashcard, 1);
        if (flashcards.length === 0) {
            localStorage.setItem('learnedCount', learnedCount);
            window.location.href = 'quiz.html';
        } else {
            displayFlashcard();
        }
    });
});

let questions = [];
let currentQuestion = 0;
let correctCount = 0;
let incorrectCount = 0;

async function fetchQuiz() {
    showLoadingScreen('Generating Quizzes')
    const PreResponse = localStorage.getItem('PreResponse');
    const quizzesAmount = localStorage.getItem('quizzesAmount');
    const prompt = `The upcoming list of text I give you will have the format: <Front text> $%$ <Back text> each divided by the "\\n" character (break line character); with the upcoming list of text, you will have to generate list of ${quizzesAmount} multiple choices questions (for revising the meaning and the term) with the structure: <question> $%$ <choice 1> $%$ <choice 2> $%$ <choice 3> $%$ <choice 4> $%$ <the numerical order of the right choice> (example generated text: "Who are you? $%$ I am your dad $%$ He is your mom $%$ I am your mom $%$ I love you $%$ 3") The list of text is: ${PreResponse}. Also just write the response in plain text no bold or italics characters and line breaks in each question only.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const ans = response.text();
    
    var str = ans + '';
    console.log(str);

    questions = str.split('\n').filter(Boolean).map(item => {
        const parts = item.split(' $%$ ');
        return {
            question: parts[0],
            choices: parts.slice(1,5),
            correctChoice: parseInt(parts[5])
        };
    });

    // vocabulary = data.choices[0].text.split('\n').filter(Boolean).map((q) => {
    //     const parts = q.split('|');
    //     return {
    //         word: parts[0],
    //         options: parts.slice(1, 5),
    //         correctOption: parseInt(parts[5])
    //     };
    // });
    hideLoadingScreen();
    displayQuestion();
}

function displayQuestion() {
    if (questions.length === 0) return;
    const questionData = questions[currentQuestion];
    document.getElementById('question').innerText = questionData.question;
    document.querySelectorAll('.option').forEach((btn, index) => {
        btn.innerText = questionData.choices[index];
    });
}

if(window.location.pathname.endsWith('quiz.html')) {
    const cButton1 = document.querySelector("#btn1");
    console.log(cButton1);

    cButton1.addEventListener('click',() => {
        checkAnswer(1);
    });

    const cButton2 = document.querySelector("#btn2");
    cButton2.addEventListener('click', () => {
        checkAnswer(2);
    });

    const cButton3 = document.querySelector("#btn3");
    cButton3.addEventListener('click', () => {
        checkAnswer(3);
    });

    const cButton4 = document.querySelector("#btn4");
    cButton4.addEventListener('click', () => {
        checkAnswer(4);
    });
}
function checkAnswer(selectedOption) {
    const questionData = questions[currentQuestion];
    if (questionData.correctChoice === selectedOption) {
        correctCount++;
        document.getElementById('correctCount').innerText = correctCount;
    } else {
        incorrectCount++;
        document.getElementById('incorrectCount').innerText = incorrectCount;
    }
    currentQuestion++;
    if (currentQuestion < questions.length) {
        displayQuestion();
    } else {
        alert('Quiz Finished!');
    }
}

if (window.location.pathname.endsWith('flashcards.html')) {
    fetchVocabulary();
} else if (window.location.pathname.endsWith('quiz.html')) {
    fetchQuiz();
}