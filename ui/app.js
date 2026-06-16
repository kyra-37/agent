// --- State Variables ---
let geminiApiKey = localStorage.getItem('gemini_api_key') || '';
let isRunning = false;

// --- DOM Elements ---
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const btnSettingsClose = document.getElementById('btn-settings-close');
const settingsPanel = document.getElementById('settings-panel');
const inputGeminiKey = document.getElementById('input-gemini-key');
const btnSaveSettings = document.getElementById('btn-save-settings');
const btnClearSettings = document.getElementById('btn-clear-settings');

const inputPrompt = document.getElementById('input-prompt');
const btnRunSimulation = document.getElementById('btn-run-simulation');
const btnRunLive = document.getElementById('btn-run-live');
const modeIndicator = document.querySelector('.mode-indicator');
const modeText = document.getElementById('mode-text');

const emptyState = document.getElementById('empty-state');
const timelineSteps = document.getElementById('timeline-steps');
const btnClearWorkspace = document.getElementById('btn-clear-workspace');

// --- Initialization ---
if (geminiApiKey) {
    inputGeminiKey.value = geminiApiKey;
    setModeState('live', 'API Key loaded. Ready to run live.');
} else {
    setModeState('ready', 'Ready to run in Simulation Mode');
}

// --- Event Listeners ---
btnSettingsToggle.addEventListener('click', () => settingsPanel.classList.toggle('hidden'));
btnSettingsClose.addEventListener('click', () => settingsPanel.classList.add('hidden'));

btnSaveSettings.addEventListener('click', () => {
    const key = inputGeminiKey.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        geminiApiKey = key;
        setModeState('live', 'API Key saved. Ready to run live.');
        alert('API Key saved successfully!');
        settingsPanel.classList.add('hidden');
    } else {
        alert('Please enter a valid API Key.');
    }
});

btnClearSettings.addEventListener('click', () => {
    localStorage.removeItem('gemini_api_key');
    geminiApiKey = '';
    inputGeminiKey.value = '';
    setModeState('ready', 'API Key cleared. Ready to run in Simulation Mode.');
    alert('API Key cleared.');
    settingsPanel.classList.add('hidden');
});

btnClearWorkspace.addEventListener('click', clearWorkspace);
btnRunSimulation.addEventListener('click', () => runAgent(true));
btnRunLive.addEventListener('click', () => runAgent(false));

// --- Helper Functions ---
function setModeState(state, text) {
    modeIndicator.className = 'mode-indicator';
    if (state === 'simulation') {
        modeIndicator.classList.add('simulation');
    } else if (state === 'live') {
        modeIndicator.classList.add('live');
    } else if (state === 'error') {
        modeIndicator.classList.add('error-mode');
    } else {
        modeIndicator.classList.add('ready');
    }
    modeText.textContent = text;
}

function clearWorkspace() {
    timelineSteps.innerHTML = '';
    timelineSteps.classList.add('hidden');
    emptyState.classList.remove('hidden');
    btnClearWorkspace.disabled = true;
}

function setControlsDisabled(disabled) {
    isRunning = disabled;
    btnRunSimulation.disabled = disabled;
    btnRunLive.disabled = disabled;
    inputPrompt.disabled = disabled;
    btnClearWorkspace.disabled = disabled || timelineSteps.children.length === 0;
}

function getTimestamp() {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
}

// Safe local math evaluator corresponding to python script's calculate tool
function calculate(expression) {
    try {
        const allowedChars = /^[0-9\+\-\*\/\(\)\.\s]+$/;
        if (!allowedChars.test(expression)) {
            return "Error: Illegal characters in expression.";
        }
        // Safely evaluate standard math expression in JavaScript
        const result = Function(`"use strict"; return (${expression})`)();
        return result !== undefined && result !== null ? result.toString() : "Error";
    } catch (e) {
        return `Error evaluating expression: ${e.message}`;
    }
}

// --- UI Step Card Generators ---
function appendThinkingCard(title, id) {
    const card = document.createElement('div');
    card.className = 'step-card iteration-step';
    card.id = id;
    card.innerHTML = `
        <div class="step-header">
            <span class="step-title">🤖 ${title}</span>
            <span class="step-time">${getTimestamp()}</span>
        </div>
        <div class="step-content">
            <div class="thinking-container">
                <span>Agent is thinking</span>
                <span class="thinking-dots">
                    <span class="thinking-dot"></span>
                    <span class="thinking-dot"></span>
                    <span class="thinking-dot"></span>
                </span>
            </div>
        </div>
    `;
    timelineSteps.appendChild(card);
    timelineSteps.scrollTop = timelineSteps.scrollHeight;
    return card;
}

function updateThinkingCardContent(id, textContent, htmlContent = '') {
    const card = document.getElementById(id);
    if (!card) return;
    
    const contentArea = card.querySelector('.step-content');
    if (htmlContent) {
        contentArea.innerHTML = htmlContent;
    } else {
        contentArea.innerHTML = `<p class="markdown-text">${textContent}</p>`;
    }
}

function appendToolCard(toolName, args, output) {
    const card = document.createElement('div');
    card.className = 'step-card tool-step';
    card.innerHTML = `
        <div class="step-header">
            <span class="step-title">🛠️ Tool Invocation: ${toolName}</span>
            <span class="step-time">${getTimestamp()}</span>
        </div>
        <div class="step-content">
            <div class="info-pill">Action: Execute code statement</div>
            <pre class="code-block tool-call">calculate(expression="${args.expression}")</pre>
            <div class="info-pill" style="margin-top: 10px;">Observation: Result returned</div>
            <pre class="code-block tool-result">${output}</pre>
        </div>
    `;
    timelineSteps.appendChild(card);
    timelineSteps.scrollTop = timelineSteps.scrollHeight;
}

function appendFinalAnswerCard(answer) {
    const card = document.createElement('div');
    card.className = 'step-card final-step';
    card.innerHTML = `
        <div class="step-header">
            <span class="step-title">💡 Final Response</span>
            <span class="step-time">${getTimestamp()}</span>
        </div>
        <div class="step-content">
            <div class="markdown-text">${answer.replace(/\n/g, '<br>')}</div>
        </div>
    `;
    timelineSteps.appendChild(card);
    timelineSteps.scrollTop = timelineSteps.scrollHeight;
}

function appendErrorCard(title, message) {
    const card = document.createElement('div');
    card.className = 'step-card error-step';
    card.innerHTML = `
        <div class="step-header">
            <span class="step-title">❌ ${title}</span>
            <span class="step-time">${getTimestamp()}</span>
        </div>
        <div class="step-content">
            <div class="error-pill">${message}</div>
        </div>
    `;
    timelineSteps.appendChild(card);
    timelineSteps.scrollTop = timelineSteps.scrollHeight;
}

// --- Agent Executors ---

async function runAgent(forceSimulation = false) {
    if (isRunning) return;
    
    const userPrompt = inputPrompt.value.trim();
    if (!userPrompt) {
        alert('Please enter a mathematical query.');
        return;
    }
    
    // Setup UI workspace
    clearWorkspace();
    emptyState.classList.add('hidden');
    timelineSteps.classList.remove('hidden');
    setControlsDisabled(true);
    
    // Choose mode
    if (forceSimulation || !geminiApiKey) {
        if (!forceSimulation && !geminiApiKey) {
            appendThinkingCard("System Log", "system-log");
            updateThinkingCardContent("system-log", "", `
                <div class="warning-pill">
                    <strong>Notice:</strong> No Gemini API key provided. Falling back to Local Simulation mode.<br>
                    To run live, click the Gear icon in the top right to save an API Key.
                </div>
            `);
            await sleep(1500);
        }
        await executeSimulation(userPrompt);
    } else {
        await executeLiveAgent(userPrompt);
    }
    
    setControlsDisabled(false);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 1. Browser Mock Simulation Mode Loop
async function executeSimulation(userPrompt) {
    setModeState('simulation', 'Running Local Simulation...');
    
    // Extract math expression dynamically
    let expression = "";
    const cleanedPrompt = userPrompt.replace(/\?/g, "").trim();
    const startIdx = cleanedPrompt.search(/[0-9\(\+\-\.]/);
    if (startIdx !== -1) {
        expression = cleanedPrompt.substring(startIdx).trim();
    }
    
    let isInvalid = false;
    let errorMessage = "";
    
    if (!expression) {
        isInvalid = true;
        errorMessage = "No mathematical expression found in the query.";
    } else {
        const checkResult = calculate(expression);
        if (checkResult.startsWith("Error")) {
            isInvalid = true;
            errorMessage = checkResult;
        }
    }
    
    if (isInvalid) {
        const cardId = "thinking-1";
        appendThinkingCard("Loop Iteration 1 - Reasoning", cardId);
        await sleep(1500);
        updateThinkingCardContent(cardId, `Analyzing the query "${userPrompt}"...`);
        await sleep(800);
        
        appendErrorCard("Invalid Expression", errorMessage);
        setModeState('error', 'Execution halted: Invalid Expression.');
        return;
    }
    
    // Iteration 1
    const card1Id = "thinking-1";
    appendThinkingCard("Loop Iteration 1 - Reasoning", card1Id);
    await sleep(2000);
    
    updateThinkingCardContent(card1Id, `To solve the query "${userPrompt}", I need to evaluate the mathematical expression step-by-step. Let me use the calculator tool.`);
    await sleep(1000);
    
    // Tool Call
    const toolOutput = calculate(expression);
    appendToolCard("calculate", { expression: expression }, toolOutput);
    await sleep(1800);
    
    // Iteration 2
    const card2Id = "thinking-2";
    appendThinkingCard("Loop Iteration 2 - Reasoning", card2Id);
    await sleep(2000);
    
    updateThinkingCardContent(card2Id, `The calculator returned the evaluated result of ${toolOutput}. I can now formulate the final step-by-step breakdown.`);
    await sleep(1000);
    
    // Final Answer
    let finalAnswer = "";
    if (expression === "137 * 48 + 256 / 16" || (expression.includes("137") && expression.includes("48"))) {
        const part1 = 137 * 48;
        const part2 = 256 / 16;
        finalAnswer = `Based on the calculate tool, here is the step-by-step evaluation:\n\n1. (137 * 48) = ${part1}\n2. (256 / 16) = ${part2}\n3. ${part1} + ${part2} = ${toolOutput}\n\nTherefore, (137 * 48) + (256 / 16) = ${toolOutput}.`;
    } else {
        finalAnswer = `Evaluating the expression '${expression}' using the calculate tool gives the result of **${toolOutput}**.`;
    }
    
    appendFinalAnswerCard(finalAnswer);
    setModeState('simulation', 'Simulation completed.');
}

// 2. Browser Live Gemini API Mode Loop
async function executeLiveAgent(userPrompt) {
    setModeState('live', 'Contacting Gemini API...');
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    
    // Setup model context
    let contents = [
        {
            role: 'user',
            parts: [{ text: userPrompt }]
        }
    ];
    
    const systemInstruction = {
        parts: [{ text: "You are a helpful AI Agent equipped with tools. Solve the user's problem step-by-step." }]
    };
    
    const tools = [
        {
            functionDeclarations: [
                {
                    name: 'calculate',
                    description: 'Safely evaluates a basic mathematical expression string.',
                    parameters: {
                        type: 'OBJECT',
                        properties: {
                            expression: {
                                type: 'STRING',
                                description: 'The mathematical expression to evaluate, e.g., "137 * 48 + 256 / 16"'
                            }
                        },
                        required: ['expression']
                    }
                }
            ]
        }
    ];
    
    const maxIterations = 5;
    
    for (let i = 0; i < maxIterations; i++) {
        const cardId = `thinking-live-${i}`;
        appendThinkingCard(`Loop Iteration ${i + 1} - Reasoning`, cardId);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: contents,
                    systemInstruction: systemInstruction,
                    tools: tools,
                    toolConfig: {
                        functionCallingConfig: {
                            mode: 'AUTO'
                        }
                    }
                })
            });
            
            if (!response.ok) {
                const errData = await response.json();
                const errMsg = errData.error?.message || response.statusText;
                throw new Error(`Gemini API returned code ${response.status}: ${errMsg}`);
            }
            
            const data = await response.json();
            const candidate = data.candidates?.[0];
            const content = candidate?.content;
            
            if (!content) {
                throw new Error("Empty candidate response returned from Gemini.");
            }
            
            // Append model response to conversation history
            contents.push(content);
            
            const parts = content.parts || [];
            let textReasoning = "";
            let functionCalls = [];
            
            for (let part of parts) {
                if (part.text) {
                    textReasoning += part.text;
                }
                if (part.functionCall) {
                    functionCalls.push(part.functionCall);
                }
            }
            
            // Show reasoning in thinking card
            updateThinkingCardContent(cardId, textReasoning || "Agent is requesting tool execution...");
            
            if (functionCalls.length > 0) {
                // Execute function call
                const functionCall = functionCalls[0];
                const toolName = functionCall.name;
                const toolArgs = functionCall.args;
                
                await sleep(1000); // UI spacing pause
                
                let toolOutput = "";
                if (toolName === 'calculate') {
                    toolOutput = calculate(toolArgs.expression);
                } else {
                    toolOutput = `Error: Unknown tool "${toolName}"`;
                }
                
                appendToolCard(toolName, toolArgs, toolOutput);
                
                // Add function response back to contents context
                contents.push({
                    role: 'tool',
                    parts: [
                        {
                            functionResponse: {
                                name: toolName,
                                response: { result: toolOutput }
                            }
                        }
                    ]
                });
                
                await sleep(1500); // UI spacing pause
            } else {
                // Final Response reached
                await sleep(800);
                appendFinalAnswerCard(textReasoning);
                setModeState('live', 'Task completed successfully via Gemini.');
                return;
            }
            
        } catch (error) {
            updateThinkingCardContent(cardId, "Connection failed.");
            appendErrorCard("API Execution Error", error.message);
            setModeState('error', 'Execution halted with errors.');
            return;
        }
    }
    
    appendErrorCard("Iteration Limit", "Agent exceeded the maximum number of loop iterations (5).");
    setModeState('error', 'Execution iteration limit hit.');
}
