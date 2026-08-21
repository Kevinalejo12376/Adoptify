import ctypes
SMTO_ABORTIFHUNG = 0x0002
HWND_BROADCAST = 0xFFFF
WM_SETTINGCHANGE = 0x001A
SendMessageTimeout = ctypes.windll.user32.SendMessageTimeoutW
# lParam must be a LPWSTR
res = SendMessageTimeout(HWND_BROADCAST, WM_SETTINGCHANGE, 0, "Environment", SMTO_ABORTIFHUNG, 5000, None)
print('Broadcasted WM_SETTINGCHANGE result:', res)
