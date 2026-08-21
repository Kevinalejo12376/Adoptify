import os
import winreg

node_path = r"C:\Program Files\nodejs"
if not os.path.isdir(node_path):
    raise SystemExit(f"Node.js folder not found: {node_path}")

with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment", 0, winreg.KEY_READ | winreg.KEY_WRITE) as key:
    try:
        current_path = winreg.QueryValueEx(key, "Path")[0]
    except FileNotFoundError:
        current_path = ""

    parts = [part for part in current_path.split(";") if part]
    if not any(part.lower() == node_path.lower() for part in parts):
        parts.append(node_path)
        new_path = ";".join(parts)
        winreg.SetValueEx(key, "Path", 0, winreg.REG_EXPAND_SZ, new_path)
        print("UPDATED_USER_PATH")
        print(new_path)
    else:
        print("NODE_PATH_ALREADY_PRESENT")
        new_path = current_path

os.environ["PATH"] = node_path + ";" + os.environ.get("PATH", "")
print("CURRENT_NPM_PATH:", os.environ["PATH"])
try:
    import subprocess
    result = subprocess.run(["npm", "--version"], capture_output=True, text=True)
    if result.returncode == 0:
        print("NPM_VERSION:", result.stdout.strip())
    else:
        print("NPM_COMMAND_FAILED", result.stderr.strip())
except FileNotFoundError:
    print("NPM_NOT_FOUND")
