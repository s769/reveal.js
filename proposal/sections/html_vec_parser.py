from bs4 import BeautifulSoup

import numpy as np

import random

#set random seed
random.seed(420)

# generate 25 random hex colors
M_COLORS = ["#%06X" % random.randint(0, 0xFFFFFF) for i in range(25)]

# remove every 5th color
M_COLORS2 = [color for i, color in enumerate(M_COLORS) if i % 5 != 4]


# generate 15 random hex colors
D_COLORS = ["#%06X" % random.randint(0, 0xFFFFFF) for i in range(15)]


# remove every 5th color
D_COLORS2 = D_COLORS[:-3]
D_COLORS2 = np.array(D_COLORS2).reshape(4,3).T.flatten()


# use beautifulsoup to make a div element


def make_vec(blocks: int, elems: int, colors: list, complex:bool = False, outer_width:int = 17, outer_height:int = 62, inner_width:int = 13, inner_height:int = 13):
    # make an outer div with class r-vstack
    # blocks
    full = BeautifulSoup(
        '<!DOCTYPE HTML> <div class="r-vstack"></div>', "html.parser"
    )
    outer_div = full.div
    # make a number of inner divs with class r-vstack
    # blocks
    inner_elem_arr = []
    count = 0
    for i in range(blocks):
        '<div class="r-vstack" style="background: rgba(255,255,255,1); width: 17px; height: 62px; margin: 10px; border-radius: 5px;"></div>',

        inner_div = BeautifulSoup(
            f'<div class="r-vstack" style="background: rgba(255,255,255,1); width: {outer_width}px; height: {outer_height}px; margin: 10px; border-radius: 5px;"></div>',
            "html.parser",
        )
        inner_div = inner_div.div
        outer_div.append(inner_div)
        # make a number of inner divsk
        # elems
        
        for j in range(elems):
            html_string = f'<div' + f' data-id="box{i+1}{j+1}"'+ ' style="background:' + colors[count] + f'; width: {inner_width}px; height: {inner_height}px; margin: 2px; border-radius: 1px;' + f"{'box-shadow: 0 0 3px 3px #000;' if complex else ''}" + '"></div>'

            inner_elem = BeautifulSoup(
                html_string,
                "html.parser",
            )
            inner_elem = inner_elem.div
            inner_div.append(inner_elem)
            inner_elem_arr.append(html_string)
            count += 1
    return full, np.array(inner_elem_arr).reshape(blocks, elems)


def make_vec_from_elem_arr(elem_arr: np.array):
    full = BeautifulSoup(
        '<!DOCTYPE HTML> <div class="r-vstack"></div>', "html.parser"
    )
    outer_div = full.div
    new_elem_arr = elem_arr.T
    for i in range(new_elem_arr.shape[0]):
        inner_div = BeautifulSoup(
            '<div class="r-vstack" style="background: rgba(255,255,255,1); width: 17px; height: 62px; margin: 10px; border-radius: 5px;"></div>',
            "html.parser",
        )
        inner_div = inner_div.div
        outer_div.append(inner_div)
        for j in range(new_elem_arr.shape[1]):
            inner_elem = BeautifulSoup(
                new_elem_arr[i, j],
                "html.parser",
            )
            inner_elem = inner_elem.div
            inner_div.append(inner_elem)
    return full

m_soti_soup, m_elem_arr = make_vec(5, 4, M_COLORS2)

file_path = "animation/m_vec_soti.html"

# with open(file_path, "wb") as file:
#     file.write(m_soti_soup.prettify("utf-8"))

m_soti_fft_soup, m_fft_elem_arr = make_vec(5, 5, M_COLORS, True, 21, 78, 17, 17)

file_path = "animation/m_vec_soti_fft.html"

# with open(file_path, "wb") as file:
#     file.write(m_soti_fft_soup.prettify("utf-8"))

m_tosi_fft_soup = make_vec_from_elem_arr(m_fft_elem_arr)

file_path = "animation/m_vec_tosi_fft.html"

# with open(file_path, "wb") as file:
#     file.write(m_tosi_fft_soup.prettify("utf-8"))

d_fft_tosi_soup, d_fft_elem_arr = make_vec(5, 3, D_COLORS, True, 28, 80, 24, 24)

file_path = "animation/d_vec_tosi_fft.html"

# with open(file_path, "wb") as file:
#     file.write(d_fft_tosi_soup.prettify("utf-8"))

d_soti_fft_soup = make_vec_from_elem_arr(d_fft_elem_arr)

file_path = "animation/d_vec_soti_fft.html"

# with open(file_path, "wb") as file:
#     file.write(d_soti_fft_soup.prettify("utf-8"))

d_soti_soup, d_elem_arr = make_vec(3, 4, D_COLORS2)

file_path = "animation/d_vec_soti.html"

# with open(file_path, "wb") as file:
#     file.write(d_soti_soup.prettify("utf-8"))



