import os
import re
import time
from deep_translator import GoogleTranslator

# Initialize translator
translator = GoogleTranslator(source='zh-CN', target='pt')

# Regex to match strings containing Chinese characters (along with common Chinese punctuation)
chinese_pattern = re.compile(r'[\u4e00-\u9fa5]+')

def find_files(directory):
    files_to_process = []
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.md')):
                files_to_process.append(os.path.join(root, file))
    return files_to_process

def extract_and_translate(files):
    unique_strings = set()
    for file in files:
        try:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
                matches = chinese_pattern.findall(content)
                unique_strings.update(matches)
        except Exception as e:
            pass

    unique_list = list(unique_strings)
    print(f"Found {len(unique_list)} unique Chinese phrases.")

    if not unique_list:
        return {}

    translation_map = {}
    
    # Translate one by one or in small chunks
    for i, orig in enumerate(unique_list):
        if i % 50 == 0:
            print(f"Translating {i}/{len(unique_list)}...")
        try:
            trans = translator.translate(orig)
            if trans:
                translation_map[orig] = trans
            else:
                translation_map[orig] = orig
            time.sleep(0.1) # rate limiting
        except Exception as e:
            translation_map[orig] = orig

    return translation_map

def apply_translations(files, translation_map):
    for file in files:
        try:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for orig in sorted(translation_map.keys(), key=len, reverse=True):
                trans = translation_map[orig]
                if trans != orig:
                    new_content = new_content.replace(orig, trans)
                    
            if new_content != content:
                with open(file, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Translated {file}")
        except Exception as e:
            pass

if __name__ == "__main__":
    base_dirs = ['/home/kira/ClawOS-BR/frontend/src', '/home/kira/ClawOS-BR/backend/src']
    all_files = []
    for d in base_dirs:
        if os.path.exists(d):
            all_files.extend(find_files(d))
            
    print(f"Found {len(all_files)} files to process.")
    translation_map = extract_and_translate(all_files)
    if translation_map:
        apply_translations(all_files, translation_map)
    print("Done!")
