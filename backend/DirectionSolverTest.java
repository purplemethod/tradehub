import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

import org.junit.jupiter.api.Test;

class DirectionSolverTest {

    @Test
    void testFindMissingFirstInstruction() {
        List<String> instructions = List.of("???", "FORWARD", "TURN LEFT", "FORWARD");
        String expected = "The first instruction should be TURN LEFT to reach the target 0,1";

        String result = DirectionSolver.findMissingFirstInstruction(instructions, 0, 1);
        assertEquals(expected, result);
    }

    @Test
    void testWithNoValidInstruction() {
        List<String> instructions = List.of("???", "TURN LEFT", "TURN LEFT", "TURN LEFT");
        String result = DirectionSolver.findMissingFirstInstruction(instructions, 99, 99);
        assertEquals("No valid instruction found to reach the target.", result);
    }
}
