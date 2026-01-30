// Configuration
const CONFIG = {
    OPENAI_API_BASE: 'https://api.openai.com/v1',
    DALLE_MODEL: 'dall-e-3',
    VISION_MODEL: 'gpt-4o',
    IMAGE_SIZE: '1024x1024',
    MAX_DESCRIPTION_TOKENS: 300,
    API_KEY_STORAGE_KEY: 'openai_api_key'
};

// State
let isGenerating = false;
let shouldStop = false;
let startTime = null;
let timerInterval = null;

// DOM Elements
const form = document.getElementById('generationForm');
const promptInput = document.getElementById('promptInput');
const iterationsInput = document.getElementById('iterationsInput');
const apiKeyInput = document.getElementById('apiKeyInput');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const clearButton = document.getElementById('clearButton');
const rememberApiKeyCheckbox = document.getElementById('rememberApiKey');
const errorDisplay = document.getElementById('errorDisplay');
const progressSection = document.getElementById('progressSection');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const timeElapsed = document.getElementById('timeElapsed');
const resultsContainer = document.getElementById('resultsContainer');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadApiKeyFromStorage();
    setupEventListeners();
});

function setupEventListeners() {
    form.addEventListener('submit', handleFormSubmit);
    stopButton.addEventListener('click', handleStop);
    clearButton.addEventListener('click', handleClear);
    rememberApiKeyCheckbox.addEventListener('change', handleRememberApiKeyToggle);
}

function loadApiKeyFromStorage() {
    const savedApiKey = localStorage.getItem(CONFIG.API_KEY_STORAGE_KEY);
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        rememberApiKeyCheckbox.checked = true;
    }
}

function handleRememberApiKeyToggle() {
    if (rememberApiKeyCheckbox.checked) {
        localStorage.setItem(CONFIG.API_KEY_STORAGE_KEY, apiKeyInput.value);
    } else {
        localStorage.removeItem(CONFIG.API_KEY_STORAGE_KEY);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    if (isGenerating) return;

    const prompt = promptInput.value.trim();
    const iterations = parseInt(iterationsInput.value);
    const apiKey = apiKeyInput.value.trim();

    // Validate inputs
    const validationError = validateInputs(prompt, iterations, apiKey);
    if (validationError) {
        showError(validationError);
        return;
    }

    // Save API key if checkbox is checked
    if (rememberApiKeyCheckbox.checked) {
        localStorage.setItem(CONFIG.API_KEY_STORAGE_KEY, apiKey);
    }

    // Start generation
    hideError();
    await runIterations(prompt, iterations, apiKey);
}

function validateInputs(prompt, iterations, apiKey) {
    if (!prompt) {
        return 'Please enter an initial prompt.';
    }

    if (!iterations || iterations < 1 || iterations > 10) {
        return 'Please enter a valid number of iterations (1-10).';
    }

    if (!apiKey || !apiKey.startsWith('sk-')) {
        return 'Please enter a valid OpenAI API key.';
    }

    return null;
}

async function runIterations(initialPrompt, iterations, apiKey) {
    isGenerating = true;
    shouldStop = false;

    // Update UI
    setUIState(true);
    startTimer();

    let currentPrompt = initialPrompt;

    try {
        for (let i = 1; i <= iterations; i++) {
            if (shouldStop) {
                showError('Generation stopped by user.');
                break;
            }

            updateProgress(i, iterations, `Generating image ${i} of ${iterations}...`);

            // Create iteration card
            const card = createIterationCard(i);
            resultsContainer.appendChild(card);
            scrollToLatest();

            // Generate image
            let imageUrl;
            try {
                imageUrl = await generateImage(currentPrompt, apiKey);
                displayImage(card, imageUrl);
            } catch (error) {
                displayImageError(card, error.message);
                throw error;
            }

            // Get description (skip for last iteration)
            if (i < iterations) {
                if (shouldStop) break;

                updateProgress(i, iterations, `Describing image ${i} of ${iterations}...`);

                try {
                    const description = await describeImage(imageUrl, apiKey);
                    displayDescription(card, description);
                    currentPrompt = description;
                } catch (error) {
                    displayDescriptionError(card, error.message);
                    throw error;
                }
            } else {
                // For the last iteration, show that it's complete
                const descContainer = card.querySelector('.description-container');
                if (descContainer) {
                    descContainer.innerHTML = '<h3>Final Image</h3><p class="description-text">Generation complete!</p>';
                }
            }

            updateProgress(i, iterations, `Completed iteration ${i} of ${iterations}`);
        }

        if (!shouldStop) {
            updateProgress(iterations, iterations, 'All iterations complete!');
        }

    } catch (error) {
        console.error('Generation error:', error);
        showError(`Error: ${error.message}`);
    } finally {
        isGenerating = false;
        setUIState(false);
        stopTimer();
    }
}

async function generateImage(prompt, apiKey) {
    const response = await fetch(`${CONFIG.OPENAI_API_BASE}/images/generations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: CONFIG.DALLE_MODEL,
            prompt: prompt,
            n: 1,
            size: CONFIG.IMAGE_SIZE
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate image');
    }

    const data = await response.json();
    return data.data[0].url;
}

async function describeImage(imageUrl, apiKey) {
    const response = await fetch(`${CONFIG.OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: CONFIG.VISION_MODEL,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Describe this image as if you were a 3 year old child.'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageUrl
                            }
                        }
                    ]
                }
            ],
            max_tokens: CONFIG.MAX_DESCRIPTION_TOKENS
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to describe image');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

function createIterationCard(iterationNum) {
    const card = document.createElement('div');
    card.className = 'iteration-card';
    card.id = `iteration-${iterationNum}`;

    card.innerHTML = `
        <div class="iteration-header">
            <div class="iteration-number">Iteration ${iterationNum}</div>
            <div class="iteration-time">${new Date().toLocaleTimeString()}</div>
        </div>
        <div class="iteration-content">
            <div class="image-container">
                <div class="image-loading">
                    <div class="spinner"></div>
                </div>
            </div>
            <div class="description-container">
                <h3>Description</h3>
                <p class="description-text">Generating...</p>
            </div>
        </div>
    `;

    return card;
}

function displayImage(card, imageUrl) {
    const imageContainer = card.querySelector('.image-container');
    imageContainer.innerHTML = `
        <img src="${imageUrl}" alt="Generated image" class="iteration-image">
        <div class="description-actions">
            <button class="btn-small" onclick="downloadImage('${imageUrl}', '${card.id}')">Download</button>
        </div>
    `;
}

function displayImageError(card, errorMessage) {
    const imageContainer = card.querySelector('.image-container');
    imageContainer.innerHTML = `
        <div style="padding: 20px; color: var(--error);">
            Failed to generate image: ${errorMessage}
        </div>
    `;
}

function displayDescription(card, description) {
    const descContainer = card.querySelector('.description-container');
    descContainer.innerHTML = `
        <h3>Description</h3>
        <p class="description-text">${description}</p>
        <div class="description-actions">
            <button class="btn-small" onclick="copyDescription('${escapeHtml(description)}')">Copy</button>
        </div>
    `;
}

function displayDescriptionError(card, errorMessage) {
    const descContainer = card.querySelector('.description-container');
    descContainer.innerHTML = `
        <h3>Description</h3>
        <p class="description-text" style="color: var(--error);">
            Failed to generate description: ${errorMessage}
        </p>
    `;
}

function updateProgress(current, total, message) {
    const percentage = (current / total) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = message;
}

function setUIState(generating) {
    if (generating) {
        startButton.disabled = true;
        stopButton.style.display = 'inline-block';
        promptInput.disabled = true;
        iterationsInput.disabled = true;
        apiKeyInput.disabled = true;
        progressSection.style.display = 'block';
    } else {
        startButton.disabled = false;
        stopButton.style.display = 'none';
        promptInput.disabled = false;
        iterationsInput.disabled = false;
        apiKeyInput.disabled = false;
    }
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        timeElapsed.textContent = `${elapsed}s`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function handleStop() {
    shouldStop = true;
    stopButton.disabled = true;
    updateProgress(0, 1, 'Stopping...');
}

function handleClear() {
    resultsContainer.innerHTML = '';
    hideError();
    progressSection.style.display = 'none';
    progressFill.style.width = '0%';
    timeElapsed.textContent = '0s';
}

function showError(message) {
    const errorContent = errorDisplay.querySelector('.error-content');
    if (errorContent) {
        errorContent.textContent = message;
    } else {
        errorDisplay.textContent = message;
    }
    errorDisplay.style.display = 'flex';
    scrollToTop();
}

function hideError() {
    errorDisplay.style.display = 'none';
}

function scrollToLatest() {
    setTimeout(() => {
        const cards = resultsContainer.querySelectorAll('.iteration-card');
        if (cards.length > 0) {
            cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 100);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Helper functions for buttons
function downloadImage(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.png`;
    link.target = '_blank';
    link.click();
}

function copyDescription(text) {
    // Unescape HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    const unescapedText = textarea.value;

    navigator.clipboard.writeText(unescapedText)
        .then(() => {
            alert('Description copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy description.');
        });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
