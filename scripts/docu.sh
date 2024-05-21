#!/usr/bin/env bash
#shellcheck shell=bash
#!/bin/bash


doc_dir="docs"
mkdir -p $doc_dir
output_file="$doc_dir/documentation.md"

echo "# Projekt Dokumentation" > $output_file
echo "Hier sind die extrahierten Dateien aus dem Code:" >> $output_file
echo "" >> $output_file

find . -type f \( -name "*.js" -o -name "*.json" \) ! -name "polygons.json" ! -name "cities.json" ! -path "./node_modules/*" | while read file; do
    echo "## Datei: $file" >> $output_file
    
    if [[ $file == *.js ]]; then
        language="javascript"
    elif [[ $file == *.json ]]; then
        language="json"
    fi

    echo '```'"$language" >> $output_file
    cat "$file" >> $output_file
    echo '' >> $output_file
    echo '```' >> $output_file
    echo "" >> $output_file
done

