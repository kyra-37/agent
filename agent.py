import os
import json
import sys
from dotenv import load_dotenv

# Reconfigure stdout and stderr to UTF-8 to handle emojis in Windows console
if sys.stdout and sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if sys.stderr and sys.stderr.encoding != 'utf-8':
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# pyrefly: ignore [missing-import]
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types

# Load API environment variables
load_dotenv()

# 1. Define a core tool the agent can use
def calculate(expression: str) -> str:
    """Safely evaluates a basic mathematical expression string."""
    try:
        # Restrict to safe mathematical characters only
        allowed_chars = "0123456789+-*/(). "
        if not all(char in allowed_chars for char in expression):
            return "Error: Illegal characters in expression."
        return str(eval(expression))
    except Exception as e:
        return f"Error evaluating expression: {str(e)}"

# Map string names to actual Python functions
AVAILABLE_TOOLS = {"calculate": calculate}

# 2. Gemini Agentic Loop
def run_agent_gemini(user_prompt: str):
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    
    # Context initialization
    contents = [
        types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)])
    ]
    
    max_iterations = 5
    for i in range(max_iterations):
        print(f"\n🔄 Loop Iteration {i+1}...")
        
        # Call LLM with tool capabilities
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction="You are a helpful AI Agent equipped with tools. Solve the user's problem step-by-step.",
                tools=[calculate],
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
            )
        )
        
        # Check if the LLM decided it needs to execute a tool (Action)
        if response.function_calls:
            # Append model's response (containing the function call request) to history
            contents.append(response.candidates[0].content)
            
            for function_call in response.function_calls:
                tool_name = function_call.name
                tool_args = function_call.args
                
                print(f"🛠️ Agent decided to use tool: {tool_name}({tool_args})")
                
                # Execute tool (Observation)
                tool_function = AVAILABLE_TOOLS[tool_name]
                tool_output = tool_function(**tool_args)
                
                print(f"📊 Tool Output: {tool_output}")
                
                # Create a Part from function response
                function_response_part = types.Part.from_function_response(
                    name=tool_name,
                    response={"result": tool_output}
                )
                
                # Feed tool results back to the LLM context
                contents.append(types.Content(
                    role="tool",
                    parts=[function_response_part]
                ))
        else:
            # No tool calls means the agent has reached a final conclusion
            print(f"\n💡 Final Answer:\n{response.text}")
            break

# 3. Mock Agentic Loop (Fallback for local demonstration)
def run_agent_mock(user_prompt: str):
    print("ℹ️ Running in Local Simulation Mode...")
    
    import re
    # Clean expression extraction
    cleaned_prompt = user_prompt.replace("?", "").strip()
    
    # Find the starting position of the mathematical expression
    expression = None
    match = re.search(r'[0-9\(\+\-\.]', cleaned_prompt)
    if match:
        start_idx = match.start()
        expression = cleaned_prompt[start_idx:].strip()
        
    is_invalid = False
    error_message = ""
    
    if not expression:
        is_invalid = True
        error_message = "No mathematical expression found in the query."
    else:
        check_result = calculate(expression)
        if check_result.startswith("Error"):
            is_invalid = True
            error_message = check_result
            
    if is_invalid:
        print(f"\n🔄 Loop Iteration 1...")
        print(f"🛠️ Agent analyzed query: {user_prompt}")
        print(f"❌ Invalid Expression: {error_message}")
        print(f"\n💡 Final Answer:\nError: Invalid mathematical expression.")
        return
        
    print(f"\n🔄 Loop Iteration 1...")
    print(f"🛠️ Agent decided to use tool: calculate({{'expression': '{expression}'}})")
    
    # Execute the tool
    tool_output = calculate(expression)
    print(f"📊 Tool Output: {tool_output}")
    
    print(f"\n🔄 Loop Iteration 2...")
    
    # Try to evaluate steps if it matches the test query
    if "137" in expression and "48" in expression:
        part1 = 137 * 48
        part2 = int(256 / 16)
        total = part1 + part2
        final_answer = (
            f"Based on the calculate tool, here is the step-by-step evaluation:\n"
            f"1. (137 * 48) = {part1}\n"
            f"2. (256 / 16) = {part2}\n"
            f"3. {part1} + {part2} = {total}\n\n"
            f"Therefore, (137 * 48) + (256 / 16) = {total}."
        )
    else:
        final_answer = f"The result of evaluating '{expression}' using the calculate tool is {tool_output}."
        
    print(f"\n💡 Final Answer:\n{final_answer}")

# 4. Main Entry Point
def run_agent(user_prompt: str = "What is (137 * 48) + (256 / 16)?"):
    print(f"\n🚀 User Task: {user_prompt}")
    
    gemini_key = os.environ.get("GEMINI_API_KEY")
    
    # Check if Gemini API key is missing or is the placeholder value
    gemini_is_placeholder = not gemini_key or "your-gemini" in gemini_key.lower()
    
    if not gemini_is_placeholder:
        try:
            print("Trying with Gemini API...")
            run_agent_gemini(user_prompt)
            return
        except Exception as e:
            # Handle invalid API key error gracefully
            if "api key" in str(e).lower() or "api_key" in str(e).lower() or "invalid_argument" in str(e).lower() or "expired" in str(e).lower():
                print(f"\n❌ Gemini API Key Error: The key is invalid or has expired.")
                print("💡 Please check your GEMINI_API_KEY in the .env file.")
            else:
                print(f"\n❌ Gemini API Error: {e}")
    else:
        print("\n❌ Gemini API key is not configured.")
        print("💡 Please replace 'your-gemini-api-key' with a valid key in the .env file.")
        
    # Fallback to local simulation mode to show how it runs
    print("\n🔄 Falling back to Local Simulation Mode...")
    run_agent_mock(user_prompt)

if __name__ == "__main__":
    # Test a query that explicitly demands multi-step tool calculation
    import sys
    prompt = sys.argv[1] if len(sys.argv) > 1 else "What is (137 * 48) + (256 / 16)?"
    run_agent(prompt)
    
