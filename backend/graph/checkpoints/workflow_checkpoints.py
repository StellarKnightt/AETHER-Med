from langgraph.checkpoint.memory import MemorySaver

# Future phases will replace this with an AsyncPostgresSaver
# to persist LangGraph checkpoints to the database for true 
# cross-server recovery and human-in-the-loop pausing.
# For this migration phase, MemorySaver establishes the Checkpoint interface.

def get_checkpointer():
    return MemorySaver()
