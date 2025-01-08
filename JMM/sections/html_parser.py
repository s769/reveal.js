from bs4 import BeautifulSoup

NEW_COLORS = [
    "#A1D032",
    "#1522D9",
    "#F49957",
    "#98C26F",
    "#5F60E9",
    "#C87CDC",
    "#14B557",
    "#B0481A",
    "#B51116",
    "#1655D0",
    "#260CA0",
    "#CA9F39",
    "#99C8E8",
    "#D35AE4",
    "#C69232",
]


import numpy as np
# make NEW_COLORS into a 3x5 matrix ,transpose it and flatten it
NEW_COLORS = np.array(NEW_COLORS).reshape(3, 5).T.flatten().tolist()



def parse_html(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        soup = BeautifulSoup(file, "html.parser")

    divs = soup.find_all("div", {"data-id": True})
    result = []

    for div in divs:
        data_id = div["data-id"]
        style = div.get("style", "")
        background_color = None
        for style_attr in style.split(";"):
            if "background" in style_attr:
                background_color = style_attr.split(":")[1].strip()
                break
        result.append((data_id, background_color))

    return result


def update_data_id(soup):
    vstack_divs = soup.find_all("div", class_="r-vstack")

    for vstack_div in vstack_divs:
        parent_div = vstack_div.find_parent("div", {"data-id": True})
        if parent_div:
            parent_data_id = parent_div["data-id"]
            parent_last_two_digits = parent_data_id[-2:]

            child_divs = vstack_div.find_all("div", {"data-id": True})
            for child_div in child_divs:
                child_data_id = child_div["data-id"]
                new_data_id = child_data_id[:-2] + parent_last_two_digits
                child_div["data-id"] = new_data_id


def set_background_colors(soup, div_data):
    for data_id, background_color in div_data:
        div = soup.find("div", {"data-id": data_id})
        if div and background_color:
            style = div.get("style", "")
            # Remove existing background attributes
            style = ";".join(
                attr for attr in style.split(";") if "background" not in attr
            )
            new_style = f"background: {background_color}; {style}"
            div["style"] = new_style


def remove_all_but_first_child(soup):
    vstack_divs = soup.find_all("div", {"data-id": True})

    for vstack_div in vstack_divs:
        data_id = vstack_div["data-id"][3:]
        if len(data_id) == 4 and data_id[1] != "1":
            vstack_div.decompose()


def update_data_id2(soup):
    vstack_divs = soup.find_all("div", {"data-id": True})
    count = 1
    for vstack_div in vstack_divs:
        data_id = vstack_div["data-id"]
        if data_id != "boxextra":
            continue
        parent_div = vstack_div.find_parent("div", {"data-id": True})
        if parent_div:
            parent_data_id = parent_div["data-id"]
            parent_last_two_digits = parent_data_id[-2:]
            new_data_id = f"box5{count}{parent_last_two_digits}"
            vstack_div["data-id"] = new_data_id
            count += 1
            if count == 5:
                count = 1


def update_data_id3(soup):
    vstack_divs = soup.find_all("div", {"data-id": True})
    count = 1
    for vstack_div in vstack_divs:
        data_id = vstack_div["data-id"]
        extra_id = data_id[-1]
        if data_id[:-1] != "boxextra":
            continue
        parent_div = vstack_div.find_parent("div", {"data-id": True})
        if parent_div:
            parent_data_id = parent_div["data-id"]
            parent_last_two_digits = parent_data_id[-2:]
            new_data_id = f"box{count}5{parent_last_two_digits}"
            vstack_div["data-id"] = new_data_id
            count += 1
            if count == 6:
                count = 1


import random


def update_colors(soup):
    divs = soup.find_all("div", {"data-id": True})
    for div in divs:
        data_id = div["data-id"][3:]
        if len(data_id) != 4:
            continue
        if data_id[0] != data_id[1]:
            continue
        flag = False
        if data_id[0] == "5":
            # set a random color as background
            rand_color = f"#%06X" % random.randint(0, 0xFFFFFF)
            flag = True
        ref_div = soup.find(
            "div", {"data-id": f"box{data_id[0]}1{data_id[2:]}", "style": True}
        )
        if not ref_div:
            continue
        style = ref_div["style"]
        background_color = None
        for style_attr in style.split(";"):
            if "background" in style_attr:
                background_color = style_attr.split(":")[1].strip()
                break
        if background_color:
            style = div.get("style", "")
            style = ";".join(
                attr for attr in style.split(";") if "background" not in attr
            )
            new_style = (
                f"background: {background_color if not flag else rand_color}; {style}"
            )
            div["style"] = new_style


def update_colors2(soup):
    divs = soup.find_all("div", {"data-id": True})
    for div in divs:
        data_id = div["data-id"][3:]
        if len(data_id) != 4:
            continue
        if data_id[0] == data_id[1]:
            continue
        style = div.get("style", "")
        style = ";".join(attr for attr in style.split(";") if "background" not in attr)
        new_style = f"background: #fff; {style}"
        div["style"] = new_style


def update_colors3(soup):
    divs = soup.find_all("div", {"data-id": True})
    for div in divs:
        data_id = div["data-id"][3:]
        if len(data_id) != 4:
            continue
        if data_id[0] != data_id[1]:
            continue
        style = div.get("style", "")
        style = ";".join(attr for attr in style.split(";"))
        new_style = f"{style}; box-shadow: 0 0 3px 3px #000;"
        div["style"] = new_style


def update_data_id4(soup):
    divs = soup.find_all("div", {"data-id": True})
    for div in divs:
        data_id = div["data-id"][3:]
        if len(data_id) != 4:
            continue
        if data_id[0] != data_id[1]:
            continue
        new_data_id = f"box{data_id[0]}1{data_id[2:]}"
        ref_div = soup.find("div", {"data-id": new_data_id})
        if not ref_div:
            continue
        div["data-id"] = new_data_id
        ref_div["data-id"] = f"box{data_id}"


def update_data_id5(soup):
    divs = soup.find_all("div", {"data-id": True})
    for div in divs:
        data_id = div["data-id"]
        if data_id == "null":
            style = div.get("style", "")
            style = ";".join(attr for attr in style.split(";"))
            new_style = f"{style}; opacity: 0;"
            div["style"] = new_style


def update_data_id6(soup):
    divs = soup.find_all("div", {"data-id": True})
    for div in divs:
        data_id = div["data-id"][3:]
        if len(data_id) != 4:
            continue
        last_2_digits = data_id[-2:]
        parent_div = div.find_parent("div", {"data-id": True})
        if parent_div:
            parent_data_id = parent_div["data-id"]
            parent_last_two_digits = parent_data_id[-2:]
            new_data_id = f"box{parent_last_two_digits}{last_2_digits}"
            div["data-id"] = new_data_id


def get_new_colors(soup):
    divs = soup.find_all("div", {"data-id": True})
    colors = []
    for div in divs:
        data_id = div["data-id"]
        if data_id[:4] == "box5":
            # append the color of the div to the list
            style = div.get("style", "")
            background_color = None
            for style_attr in style.split(";"):
                if "background" in style_attr:
                    background_color = style_attr.split(":")[1].strip()
                    break
            colors.append(background_color)
    return colors

def update_colors_tosi(soup):
    divs = soup.find_all("div", {"data-id": True})
    for div in divs:
        data_id = div["data-id"][3:]
        if len(data_id) != 2:
            continue
        if data_id[0] != data_id[1]:
            continue
        #loop through children of div
        children = div.find_all("div", {"data-id": True})
        for child in children:
            child_data_id = child["data-id"][3:]
            ref_dev = soup.find("div", {"data-id": f"box{data_id[0]}1{child_data_id[2:]}"})
            if not ref_dev:
                continue
            style = ref_dev.get("style", "")
            background_color = None
            for style_attr in style.split(";"):
                if "background" in style_attr:
                    background_color = style_attr.split(":")[1].strip()
                    break
            if background_color:
                style = child.get("style", "")
                style = ";".join(attr for attr in style.split(";") if "background" not in attr)
                new_style = f"background: {background_color}; {style}"
                child["style"] = new_style

def update_colors_tosi2(soup):
    divs = soup.find_all("div", {"data-id": True})
    for div in divs:
        data_id = div["data-id"][3:]
        if len(data_id) != 2:
            continue
        if data_id[0] == data_id[1]:
            continue
        #loop through children of div
        children = div.find_all("div", {"data-id": True})
        for child in children:
            #set background color to white
            style = child.get("style", "")
            style = ";".join(attr for attr in style.split(";") if "background" not in attr)
            new_style = f"background: #fff; {style}"
            child["style"] = new_style

def update_colors_tosi3(soup):
    divs = soup.find_all("div", {"data-id": True})
    for div in divs:
        data_id = div["data-id"][3:]
        if data_id != "55": continue
        #loop through children of div
        children = div.find_all("div", {"data-id": True})
        count = 0
        for child in children:
            #set background color to NEW_COLORS[idx]
            
            style = child.get("style", "")
            style = ";".join(attr for attr in style.split(";") if "background" not in attr)
            new_style = f"background: {NEW_COLORS[count]}; {style}"
            child["style"] = new_style
            count += 1

def update_colors_tosi4(soup):
    divs = soup.find_all("div", {"data-id": True})
    for div in divs:
        #if background color is white, set opacity to 0
        
        data_id = div["data-id"][3:]
        if data_id == "null":
            #set opacity to 0
            style = div.get("style", "")
            style = ";".join(attr for attr in style.split(";"))
            new_style = f"{style}; opacity: 0;"
            div["style"] = new_style
        if len(data_id) != 4:
            continue
        

        
def update_data_id_tosi(soup):
    divs = soup.find_all("div", {"data-id": True})
    for div in divs:
        data_id = div["data-id"][3:]
        if len(data_id) != 2:
            continue
        div["data-id"] = "null"
        # #loop through children of div
        # children = div.find_all("div", {"data-id": True})
        # #set data-id of children to null
        # for child in children:
        #     child["data-id"] = "null"
        #set background color of div to rgba(255, 255, 255, 1)



# Example usage
file_path = "animation/f_mat_soti.html"
with open(file_path, "r", encoding="utf-8") as file:
    soup = BeautifulSoup(file, "html.parser")



update_data_id_tosi(soup)

# with open(file_path, "wb") as file:
#     file.write(soup.prettify("utf-8"))

# div_data = parse_html(file_path)

# fp2 = 'tosi_to_soti_animation2.html'
# with open(fp2, 'r', encoding='utf-8') as file:
#     soup2 = BeautifulSoup(file, 'html.parser')

# set_background_colors(soup2, div_data)

# with open(fp2, "wb") as file:
#     file.write(soup2.prettify("utf-8"))

# div_data = parse_html(file_path)
# print(div_data)
