import java.util.Stack;

public class BracketValidator {

    public static boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();

        for (char ch : s.toCharArray()) {
            switch (ch) {
                case '(':
                    stack.push(')');
                    break;
                case '[':
                    stack.push(']');
                    break;
                case ')':
                case ']':
                    if (stack.isEmpty() || stack.pop() != ch)
                        return false;
                    break;
                default:
                    // Caracteres inválidos
                    return false;
            }
        }

        return stack.isEmpty();
    }

    // Exemplo de uso
    public static void main(String[] args) {
        System.out.println(isValid("([)]")); // false
        System.out.println("(()[]))[(]]])(]): " + isValid("(()[]))[(]]])(])")); // false
        System.out.println(isValid("()")); // true
        System.out.println(isValid("(((())))")); // true
        System.out.println(isValid("([])")); // true
        System.out.println("[()]:" + isValid("[()]")); // false
        System.out.println("[(]):" + isValid("[(])")); // false
        System.out.println(isValid("(")); // false
        System.out.println(isValid("(")); // false
        System.out.println(isValid("]")); // false
    }
}