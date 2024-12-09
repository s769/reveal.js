from bs4 import BeautifulSoup

def parse_html(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        soup = BeautifulSoup(file, 'html.parser')
    
    divs = soup.find_all('div', {'data-id': True})
    result = []
    
    for div in divs:
        data_id = div['data-id']
        style = div.get('style', '')
        background_color = None
        for style_attr in style.split(';'):
            if 'background' in style_attr:
                background_color = style_attr.split(':')[1].strip()
                break
        result.append((data_id, background_color))
    
    return result

def update_data_id(soup):
    vstack_divs = soup.find_all('div', class_='r-vstack')
    
    for vstack_div in vstack_divs:
        parent_div = vstack_div.find_parent('div', {'data-id': True})
        if parent_div:
            parent_data_id = parent_div['data-id']
            parent_last_two_digits = parent_data_id[-2:]
            
            child_divs = vstack_div.find_all('div', {'data-id': True})
            for child_div in child_divs:
                child_data_id = child_div['data-id']
                new_data_id = child_data_id[:-2] + parent_last_two_digits
                child_div['data-id'] = new_data_id

def set_background_colors(soup, div_data):
    for data_id, background_color in div_data:
        div = soup.find('div', {'data-id': data_id})
        if div and background_color:
            style = div.get('style', '')
            # Remove existing background attributes
            style = ';'.join(attr for attr in style.split(';') if 'background' not in attr)
            new_style = f'background: {background_color}; {style}'
            div['style'] = new_style

# Example usage
file_path = 'tosi_to_soti_animation.html'
with open(file_path, 'r', encoding='utf-8') as file:
    soup = BeautifulSoup(file, 'html.parser')

div_data = parse_html(file_path)

fp2 = 'tosi_to_soti_animation2.html'
with open(fp2, 'r', encoding='utf-8') as file:
    soup2 = BeautifulSoup(file, 'html.parser')

set_background_colors(soup2, div_data)

with open(fp2, "wb") as file:
    file.write(soup2.prettify("utf-8"))

# div_data = parse_html(file_path)
# print(div_data)
