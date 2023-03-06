EXECUTABLE := b2sMiner

CC_FILES   := miner.cpp

###########################################################

ARCH=$(shell uname | sed -e 's/-.*//g')

OBJDIR=objs
CXX=g++ -m64
FILES= ~/BLAKE2/ref/blake2s-ref.c 
CXXFLAGS= -std=c++2a -Ofast -Wall -fopenmp  -I ~/BLAKE2/ref 
ifeq ($(ARCH), Darwin)
# Building on mac
LDFLAGS= 
else
# Building on Linux
LDFLAGS=-lcrypto
endif

OBJS=$(OBJDIR)/miner.o  


.PHONY: dirs clean

default: $(EXECUTABLE)

dirs:
		mkdir -p $(OBJDIR)/

clean:
		rm -rf $(OBJDIR) *.ppm *~ $(EXECUTABLE)

$(EXECUTABLE): dirs $(OBJS)
		$(CXX) $(FILES) $(CXXFLAGS) -o $@ $(OBJS) $(LDFLAGS)


$(OBJDIR)/%.o: %.cpp
		$(CXX) $< $(CXXFLAGS) -c -o $@




