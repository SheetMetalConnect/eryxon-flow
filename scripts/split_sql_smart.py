import os
import re

def split_sql_file_smart(input_file, output_dir, chunk_size_chars=15000):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Simple state machine to find statement boundaries
    # We want to split on ';' that is NOT inside a string literal or a dollar-quoted string
    
    statements = []
    current_stmt_start = 0
    i = 0
    length = len(content)
    
    in_string = False # '...'
    in_dollar = False # $$...$$ or $tag$...$tag$
    dollar_tag = ""
    
    while i < length:
        char = content[i]
        
        if not in_string and not in_dollar:
            if char == "'":
                in_string = True
            elif char == '$':
                # Check for dollar quote start
                # Look ahead for $tag$
                match = re.match(r'\$([a-zA-Z0-9_]*)\$', content[i:])
                if match:
                    in_dollar = True
                    dollar_tag = match.group(1)
                    i += len(match.group(0)) - 1
            elif char == ';':
                # Found a split point!
                stmt = content[current_stmt_start:i+1].strip()
                if stmt:
                    statements.append(stmt)
                current_stmt_start = i + 1
            elif char == '-' and i + 1 < length and content[i+1] == '-':
                 # fast forward to newline to skip comments
                 newline = content.find('\n', i)
                 if newline == -1:
                     i = length
                 else:
                     i = newline
        
        elif in_string:
            if char == "'":
                # Check for escaped quote ''
                if i + 1 < length and content[i+1] == "'":
                    i += 1
                else:
                    in_string = False
        
        elif in_dollar:
            if char == '$':
                # Check if it matches the closing tag
                match = re.match(r'\$([a-zA-Z0-9_]*)\$', content[i:])
                if match and match.group(1) == dollar_tag:
                    in_dollar = False
                    i += len(match.group(0)) - 1
        
        i += 1

    # Add last statement if any
    if current_stmt_start < length:
        stmt = content[current_stmt_start:].strip()
        if stmt:
            statements.append(stmt)

    # Now group statements into chunks
    chunk_idx = 0
    current_chunk_stmts = []
    current_chunk_size = 0
    
    for stmt in statements:
        # Check if adding this statement would exceed the limit (unless it's empty/trivial)
        # But we must have at least one statement if possible
        if current_chunk_size + len(stmt) > chunk_size_chars and current_chunk_stmts:
            # write chunk
            chunk_filename = f"part_{chunk_idx:03d}.sql"
            with open(os.path.join(output_dir, chunk_filename), 'w', encoding='utf-8') as out:
                out.write("\n\n".join(current_chunk_stmts))
            print(f"Created {chunk_filename} ({current_chunk_size} chars)")
            
            chunk_idx += 1
            current_chunk_stmts = []
            current_chunk_size = 0
        
        current_chunk_stmts.append(stmt)
        current_chunk_size += len(stmt)

    # Write remaining
    if current_chunk_stmts:
        chunk_filename = f"part_{chunk_idx:03d}.sql"
        with open(os.path.join(output_dir, chunk_filename), 'w', encoding='utf-8') as out:
            out.write("\n\n".join(current_chunk_stmts))
        print(f"Created {chunk_filename} ({current_chunk_size} chars)")

if __name__ == "__main__":
    split_sql_file_smart("supabase/migrations/20260121175020_remote_schema.sql", "temp_sql_chunks_smart")
