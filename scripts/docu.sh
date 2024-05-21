#!/usr/bin/env bash
#shellcheck shell=bash

doc_dir="docs"
mkdir -p $doc_dir
output_file="$doc_dir/documentation.md"

echo "# Project Documentation" > $output_file
echo "Below are the extracted files from the code:" >> $output_file
echo "" >> $output_file

find . -type f \( -name "*.js" -o -name "*.json" \) ! -name "polygons.json" ! -path "./node_modules/*" | while read file; do
    echo "## File: $file" >> $output_file

    processing=0
    highlight=""

    while IFS= read -r line; do
        if [[ "$line" =~ @doc-start:(.*) ]]; then
            highlight="${BASH_REMATCH[1]}"
            echo "```$highlight" >> $output_file
            processing=1
        elif [[ "$line" =~ @doc-end ]]; then
            # End processing and close the code block
            echo "```" >> $output_file
            processing=0
        elif [[ "$processing" -eq 1 ]]; then
            echo "$line" >> $output_file
        fi
    done < "$file"
    echo "" >> $output_file
done

