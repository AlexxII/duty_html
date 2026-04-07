import os

key = 42
with open("vid.mp4", "rb") as f:
    data = f.read()

# Шифруем XOR и превращаем в строку массива
encrypted_list = [str(b ^ key) for b in data]
js_content = "var _V_DATA = [" + ",".join(encrypted_list) + "];"

with open("vid_data.js", "w") as f:
    f.write(js_content)
