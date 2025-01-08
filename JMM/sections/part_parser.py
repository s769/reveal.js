from bs4 import BeautifulSoup


def assign_unique_data_id(soup: BeautifulSoup):
    for i, div in enumerate(soup.find_all("div")):
        div["data-id"] = f"box{i+1}"
    return soup

def assign_unique_data_id2(soup: BeautifulSoup):
    for i, p in enumerate(soup.find_all("p")):
        p["data-id"] = f"par{i+1}"
    return soup

file_path = "animation/partitioning1.html"

with open(file_path, "r") as f:
    soup = BeautifulSoup(f, "html.parser")

soup = assign_unique_data_id2(soup)

with open(file_path, "wb") as f:
    f.write(soup.prettify("utf-8"))