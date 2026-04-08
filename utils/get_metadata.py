import json

prompt = "Утилита получения списка должностей"
prompt += "\nИспользование 'python3 get_metadata.py staff.json"
print(prompt)

positions_file = "positions_pool.json"


def main(args):
    if len(args) > 1:
        try:
            with open(args[1]) as f:
                data = json.load(f)
        except OSError as e:
            print(f"Some error - {e}")
        else:
            positions = [person["position"] for person in data if person["position"]]
            positions_list = list(dict.fromkeys(positions))

            try:
                with open(positions_file, "w", encoding="utf-8") as f:
                    json.dump(positions_list, f, ensure_ascii=False, indent=4)
            except OSError as e:
                print(f"Some error - {e}")

            print("Done!")

    else:
        print("Нет файла для анализа!")


if __name__ == "__main__":
    import sys

    main(sys.argv)
