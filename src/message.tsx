function Message() {
    const imie = "imie";
    if (imie)
        return <h1>Hello {imie}!</h1>;
    else
        return <h1>Hello World!</h1>;
}

export default Message;